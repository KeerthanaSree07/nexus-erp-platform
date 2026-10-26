import { Router } from 'express';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Expense } from '../models/Expense.js';
import { Order } from '../models/Order.js';
import { Purchase } from '../models/Purchase.js';

export const financeRouter = Router();

// GET /api/finance/reports
financeRouter.get('/reports', async (_req, res) => {
  try {
    const [invoices, payments, expenses, activeOrders, openPurchases] = await Promise.all([
      Invoice.find(),
      Payment.find(),
      Expense.find(),
      Order.find({ status: { $in: ['Confirmed', 'Fulfilled'] } }),
      Purchase.find({ status: { $in: ['Pending', 'Approved', 'Partially received'] } }),
    ]);

    const recognizedRevenue = invoices.reduce((acc, inv) => acc + (Number(inv.data?.total) || 0), 0);
    const paymentsReceived = payments.reduce((acc, p) => acc + (Number(p.data?.amount) || 0), 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.data?.amount) || 0), 0);
    const outstandingReceivables = activeOrders.reduce((acc, o) => {
      const orderTotal = Number(o.data?.total) || 0;
      const paid = Number(o.data?.paidAmount) || 0;
      return acc + Math.max(0, orderTotal - paid);
    }, 0);
    const openPurchaseCommitment = openPurchases.reduce((acc, po) => acc + (Number(po.data?.total) || 0), 0);
    const indicativeOperatingResult = recognizedRevenue - totalExpenses;

    res.json({
      data: {
        recognizedRevenue,
        paymentsReceived,
        outstandingReceivables,
        expenses: totalExpenses,
        openPurchaseCommitment,
        indicativeOperatingResult,
        accountingNote:
          'Financial summaries keep recognized invoice revenue, payments received, outstanding receivables, recorded expenses, and open purchase commitments separate. The operating result is indicative only; this application does not provide double-entry accounting.',
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/finance/ledger
financeRouter.get('/ledger', async (_req, res) => {
  try {
    const [payments, expenses] = await Promise.all([
      Payment.find().sort({ createdAt: -1 }).limit(50),
      Expense.find().sort({ createdAt: -1 }).limit(50),
    ]);

    const unified = [
      ...payments.map(p => ({
        id: p._id,
        type: 'Payment',
        code: p.code,
        name: p.name,
        status: p.status,
        data: { amount: p.data?.amount || 0 },
        createdAt: p.createdAt,
      })),
      ...expenses.map(e => ({
        id: e._id,
        type: 'Expense',
        code: e.code,
        name: e.name,
        status: e.status,
        data: { amount: e.data?.amount || 0 },
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ data: unified });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
