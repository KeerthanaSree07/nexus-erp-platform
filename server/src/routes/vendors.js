import { Router } from 'express';
import { Vendor } from '../models/Vendor.js';

export const vendorsRouter = Router();

vendorsRouter.get('/', async (_req, res) => {
  try {
    const list = await Vendor.find().sort({ name: 1 });
    res.json({ data: list.map(v => ({ id: v._id, name: v.name, email: v.email, phone: v.phone, address: v.address })) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

vendorsRouter.post('/', async (req, res) => {
  try {
    const v = await Vendor.create(req.body);
    res.status(201).json({ data: { id: v._id, name: v.name } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
