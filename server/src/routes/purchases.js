import { Router } from 'express';
import { Purchase } from '../models/Purchase.js';
import { Vendor } from '../models/Vendor.js';
import { Product } from '../models/Product.js';
import { logActivity } from '../helpers/audit.js';

export const purchasesRouter = Router();

// GET /api/purchases
purchasesRouter.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ createdAt: -1 });
    res.json({
      data: purchases.map(p => ({
        id: p._id, code: p.code, name: p.name, status: p.status,
        data: p.data, createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/purchases  — create PO
purchasesRouter.post('/', async (req, res) => {
  try {
    const { vendorId, items } = req.body;
    if (!vendorId || !items?.length) return res.status(400).json({ message: 'Vendor and at least one item are required.' });

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found.' });

    const poItems = [];
    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found.` });
      const qty = Number(item.quantity) || 1;
      const cost = Number(item.unitCost) || 0;
      const lineTotal = qty * cost;
      total += lineTotal;
      poItems.push({
        productId: product._id, name: product.name,
        orderedQuantity: qty, receivedQuantity: 0, unitCost: cost, lineTotal,
      });
    }

    const purchase = await Purchase.create({ name: vendor.name, vendorId, data: { items: poItems, total } });
    logActivity(req.user, 'Created purchase order', 'Purchase', purchase._id);
    res.status(201).json({ data: { id: purchase._id, code: purchase.code, name: purchase.name, status: purchase.status, data: purchase.data } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/purchases/:id/approve
purchasesRouter.post('/:id/approve', async (req, res) => {
  try {
    const po = await Purchase.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
    if (po.status !== 'Pending') return res.status(400).json({ message: 'Only pending POs can be approved.' });

    po.status = 'Approved';
    await po.save();
    logActivity(req.user, 'Approved purchase order', 'Purchase', po._id);
    res.json({ data: { id: po._id, status: po.status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/purchases/:id/receive
purchasesRouter.post('/:id/receive', async (req, res) => {
  try {
    const po = await Purchase.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase order not found.' });
    if (!['Approved', 'Partially received'].includes(po.status)) {
      return res.status(400).json({ message: 'Only approved or partially-received POs can accept goods.' });
    }

    const { items: received } = req.body;
    if (!received?.length) return res.status(400).json({ message: 'Provide at least one item to receive.' });

    for (const recv of received) {
      const poItem = po.data.items.find(i => String(i.productId) === String(recv.productId));
      if (!poItem) continue;
      const qty = Number(recv.quantity) || 0;
      if (qty <= 0) continue;
      const remaining = poItem.orderedQuantity - poItem.receivedQuantity;
      if (qty > remaining) {
        return res.status(400).json({ message: `Cannot receive more than ${remaining} for ${poItem.name}.` });
      }
      poItem.receivedQuantity += qty;

      // Update stock
      await Product.findByIdAndUpdate(recv.productId, { $inc: { 'data.stock': qty } });
    }

    // Determine new status
    const allReceived = po.data.items.every(i => i.receivedQuantity >= i.orderedQuantity);
    po.status = allReceived ? 'Received' : 'Partially received';
    po.markModified('data');
    await po.save();

    logActivity(req.user, 'Recorded goods receipt', 'Purchase', po._id);
    res.json({ data: { id: po._id, status: po.status, data: po.data } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
