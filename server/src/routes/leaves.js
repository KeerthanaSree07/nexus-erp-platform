import { Router } from 'express';
import { Leave } from '../models/Leave.js';
import { Employee } from '../models/Employee.js';
import { logActivity } from '../helpers/audit.js';

export const leavesRouter = Router();

// GET /api/leaves
leavesRouter.get('/', async (_req, res) => {
  try {
    const list = await Leave.find().sort({ createdAt: -1 });
    res.json({
      data: list.map(l => ({
        id: l._id,
        name: l.name,
        status: l.status,
        data: l.data,
        createdAt: l.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/leaves
leavesRouter.post('/', async (req, res) => {
  try {
    const { employeeId, startDate, endDate, reason } = req.body;
    if (!employeeId || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'Employee, start date, end date, and reason are required.' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const leave = await Leave.create({
      employeeId,
      name: employee.name,
      status: 'Pending',
      data: { startDate, endDate, reason },
    });

    logActivity(req.user, 'Requested leave for employee', 'Leave', leave._id);
    res.status(201).json({
      data: {
        id: leave._id,
        name: leave.name,
        status: leave.status,
        data: leave.data,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/leaves/:id/decision
leavesRouter.patch('/:id/decision', async (req, res) => {
  try {
    const { decision } = req.body;
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be Approved or Rejected.' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });

    leave.status = decision;
    await leave.save();

    if (decision === 'Approved') {
      await Employee.findByIdAndUpdate(leave.employeeId, { 'data.status': 'On leave' });
    }

    logActivity(req.user, `${decision} leave request`, 'Leave', leave._id);
    res.json({ data: { id: leave._id, status: leave.status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
