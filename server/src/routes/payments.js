import { Router } from 'express';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { logActivity } from '../helpers/audit.js';

export const paymentsRouter = Router();

// GET /api/payments
paymentsRouter.get('/', async (_req, res) => {
  try {
    const list = await Payment.find().sort({ createdAt: -1 });
    res.json({
      data: list.map(p => ({
        id: p._id,
        code: p.code,
        name: p.name,
        type: p.type,
        status: p.status,
        data: p.data,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payments
paymentsRouter.post('/', async (req, res) => {
  try {
    const { orderId, amount, method, reference, idempotencyKey } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required.' });
    }

    if (idempotencyKey) {
      const existing = await Payment.findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          data: {
            id: existing._id,
            code: existing.code,
            name: existing.name,
            status: existing.status,
            data: existing.data,
          },
        });
      }
    }

    let customerName = 'Customer payment';
    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        customerName = `Payment for ${order.code} (${order.name})`;
        order.data.paidAmount = (Number(order.data.paidAmount) || 0) + Number(amount);
        order.markModified('data');
        await order.save();
      }
    }

    const payment = await Payment.create({
      name: customerName,
      orderId: orderId || undefined,
      idempotencyKey,
      status: 'Recorded',
      type: 'Payment',
      data: {
        amount: Number(amount),
        method: method || 'Bank transfer',
        reference: reference || '',
      },
    });

    logActivity(req.user, 'Recorded customer payment', 'Payment', payment._id);
    res.status(201).json({
      data: {
        id: payment._id,
        code: payment.code,
        name: payment.name,
        status: payment.status,
        data: payment.data,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
