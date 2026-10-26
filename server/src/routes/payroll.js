import { Router } from 'express';
import { Payroll } from '../models/Payroll.js';
import { Employee } from '../models/Employee.js';
import { logActivity } from '../helpers/audit.js';

export const payrollRouter = Router();

// GET /api/payroll
payrollRouter.get('/', async (_req, res) => {
  try {
    const list = await Payroll.find().sort({ createdAt: -1 });
    res.json({
      data: list.map(p => ({
        id: p._id,
        name: p.name,
        status: p.status,
        data: p.data,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/payroll
payrollRouter.post('/', async (req, res) => {
  try {
    const { employeeId, period, basePay, allowances = [], deductions = [] } = req.body;
    if (!employeeId || !period || basePay === undefined) {
      return res.status(400).json({ message: 'Employee, pay period, and base pay are required.' });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found.' });

    const allowanceTotal = allowances.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const deductionTotal = deductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    const gross = Number(basePay) + allowanceTotal;
    const net = gross - deductionTotal;

    const payroll = await Payroll.create({
      employeeId,
      name: employee.name,
      status: 'Recorded',
      data: {
        period,
        basePay: Number(basePay),
        allowances,
        deductions,
        allowanceTotal,
        deductionTotal,
        gross,
        net,
      },
    });

    logActivity(req.user, 'Recorded payroll', 'Payroll', payroll._id);
    res.status(201).json({
      data: {
        id: payroll._id,
        name: payroll.name,
        status: payroll.status,
        data: payroll.data,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
