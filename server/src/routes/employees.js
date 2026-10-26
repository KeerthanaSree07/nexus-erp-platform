import { Router } from 'express';
import { Employee } from '../models/Employee.js';

export const employeesRouter = Router();

employeesRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { $or: [{ name: new RegExp(q, 'i') }, { code: new RegExp(q, 'i') }] } : {};
    const list = await Employee.find(filter).sort({ createdAt: -1 });
    res.json({
      data: list.map(e => ({
        id: e._id, code: e.code, name: e.name, status: e.data.status,
        data: e.data, createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

employeesRouter.post('/', async (req, res) => {
  try {
    const { name, code, data } = req.body;
    if (!name || !code) return res.status(400).json({ message: 'Employee name and ID are required.' });
    const emp = await Employee.create({ name, code, data });
    res.status(201).json({ data: { id: emp._id, name: emp.name, code: emp.code, data: emp.data } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'An employee with that ID already exists.' });
    res.status(500).json({ message: err.message });
  }
});

employeesRouter.patch('/:id', async (req, res) => {
  try {
    const { name, code, status, data } = req.body;
    const update = {};
    if (name) update.name = name;
    if (code) update.code = code;
    if (data) for (const [k, v] of Object.entries(data)) update[`data.${k}`] = v;
    if (status) update['data.status'] = status;
    const emp = await Employee.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!emp) return res.status(404).json({ message: 'Employee not found.' });
    res.json({ data: { id: emp._id, name: emp.name, code: emp.code, data: emp.data } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

employeesRouter.delete('/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Archived.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
