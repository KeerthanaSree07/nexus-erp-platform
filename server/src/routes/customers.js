import { Router } from 'express';
import { Customer } from '../models/Customer.js';

export const customersRouter = Router();

customersRouter.get('/', async (_req, res) => {
  try {
    const list = await Customer.find().sort({ name: 1 });
    res.json({ data: list.map(c => ({ id: c._id, name: c.name, email: c.email, phone: c.phone, address: c.address })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

customersRouter.post('/', async (req, res) => {
  try {
    const c = await Customer.create(req.body);
    res.status(201).json({ data: { id: c._id, name: c.name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
