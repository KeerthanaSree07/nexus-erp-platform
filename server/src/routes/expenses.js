import { Router } from 'express';
import { Expense } from '../models/Expense.js';
import { logActivity } from '../helpers/audit.js';

export const expensesRouter = Router();

// GET /api/expenses
expensesRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, 'i') },
            { code: new RegExp(q, 'i') },
            { 'data.category': new RegExp(q, 'i') },
          ],
        }
      : {};
    const list = await Expense.find(filter).sort({ createdAt: -1 });
    res.json({
      data: list.map(e => ({
        id: e._id,
        code: e.code,
        name: e.name,
        status: e.status,
        data: e.data,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/expenses
expensesRouter.post('/', async (req, res) => {
  try {
    const { name, category, amount, date, status = 'Recorded', data } = req.body;
    const expenseData = {
      category: category || data?.category || 'General',
      amount: Number(amount ?? data?.amount ?? 0),
      date: date || data?.date || new Date().toISOString().split('T')[0],
    };

    const expense = await Expense.create({
      name: name || 'Expense',
      status,
      data: expenseData,
    });

    logActivity(req.user, 'Recorded expense', 'Expense', expense._id);
    res.status(201).json({
      data: {
        id: expense._id,
        code: expense.code,
        name: expense.name,
        status: expense.status,
        data: expense.data,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/expenses/:id
expensesRouter.patch('/:id', async (req, res) => {
  try {
    const { name, code, status, data } = req.body;
    const update = {};
    if (name) update.name = name;
    if (code) update.code = code;
    if (status) update.status = status;
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        update[`data.${k}`] = k === 'amount' ? Number(v) : v;
      }
    }
    const expense = await Expense.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!expense) return res.status(404).json({ message: 'Expense not found.' });
    res.json({
      data: {
        id: expense._id,
        code: expense.code,
        name: expense.name,
        status: expense.status,
        data: expense.data,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/expenses/:id
expensesRouter.delete('/:id', async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Archived.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
