import { Router } from 'express';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Invoice } from '../models/Invoice.js';
import { Setting } from '../models/Setting.js';
import { logActivity } from '../helpers/audit.js';

export const ordersRouter = Router();

// GET /api/orders
ordersRouter.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({
      data: orders.map(o => ({
        id: o._id, code: o.code, name: o.name, status: o.status,
        data: o.data, createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders  — create draft
ordersRouter.post('/', async (req, res) => {
  try {
    const { customerId, items } = req.body;
    if (!customerId || !items?.length) return res.status(400).json({ message: 'Customer and at least one item are required.' });

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: 'Customer not found.' });

    const settings = await Setting.findOne({ key: 'company' });
    const taxRate = settings?.data?.taxRate || 0;

    // Resolve product prices server-side
    const orderItems = [];
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found.` });
      const unitPrice = product.data.sellingPrice || 0;
      const qty = Number(item.quantity) || 1;
      const discount = Number(item.discountPercent) || 0;
      const lineTotal = unitPrice * qty * (1 - discount / 100);
      subtotal += lineTotal;
      orderItems.push({
        productId: product._id, name: product.name,
        quantity: qty, unitPrice, discountPercent: discount, lineTotal,
      });
    }

    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const order = await Order.create({
      name: customer.name, customerId,
      data: { items: orderItems, subtotal, taxRate, tax, total, paidAmount: 0 },
    });

    logActivity(req.user, 'Created sales order', 'Order', order._id);
    res.status(201).json({ data: { id: order._id, code: order.code, name: order.name, status: order.status, data: order.data } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/:id/confirm
ordersRouter.post('/:id/confirm', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status !== 'Draft') return res.status(400).json({ message: 'Only draft orders can be confirmed.' });

    // Check and deduct stock
    for (const item of order.data.items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.name} no longer exists.` });
      if ((product.data.stock || 0) < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.name}. Available: ${product.data.stock}, required: ${item.quantity}.` });
      }
    }

    // Deduct stock
    for (const item of order.data.items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { 'data.stock': -item.quantity } });
    }

    order.status = 'Confirmed';
    await order.save();
    logActivity(req.user, 'Confirmed sales order', 'Order', order._id);
    res.json({ data: { id: order._id, status: order.status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/:id/fulfill
ordersRouter.post('/:id/fulfill', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (order.status !== 'Confirmed') return res.status(400).json({ message: 'Only confirmed orders can be fulfilled.' });

    order.status = 'Fulfilled';

    // Create invoice
    const invoice = await Invoice.create({
      name: order.name, orderId: order._id,
      data: { items: order.data.items, total: order.data.total },
    });

    order.data.invoiceCode = invoice.code;
    await order.save();

    logActivity(req.user, 'Fulfilled sales order and created invoice', 'Order', order._id);
    res.json({ data: { id: order._id, status: order.status, invoiceCode: invoice.code } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders/:id/cancel
ordersRouter.post('/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!['Draft', 'Confirmed'].includes(order.status)) {
      return res.status(400).json({ message: 'Only draft or confirmed orders can be cancelled.' });
    }

    // Restore stock if order was confirmed
    if (order.status === 'Confirmed') {
      for (const item of order.data.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { 'data.stock': item.quantity } });
      }
    }

    order.status = 'Cancelled';
    await order.save();
    logActivity(req.user, 'Cancelled sales order', 'Order', order._id);
    res.json({ data: { id: order._id, status: order.status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
