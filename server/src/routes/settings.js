import { Router } from 'express';
import { Setting } from '../models/Setting.js';
import { logActivity } from '../helpers/audit.js';

export const settingsRouter = Router();

// GET /api/settings/company
settingsRouter.get('/company', async (_req, res) => {
  try {
    let setting = await Setting.findOne({ key: 'company' });
    if (!setting) {
      setting = await Setting.create({
        key: 'company',
        name: 'Northstar Co.',
        data: { currency: 'USD', taxRate: 0 },
      });
    }
    res.json({ data: setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/settings/company
settingsRouter.patch('/company', async (req, res) => {
  try {
    const { name, data } = req.body;
    let setting = await Setting.findOne({ key: 'company' });
    if (!setting) {
      setting = new Setting({ key: 'company', name: 'Northstar Co.', data: { currency: 'USD', taxRate: 0 } });
    }

    if (name) setting.name = name;
    if (data) {
      setting.data = {
        ...setting.data,
        currency: data.currency ? String(data.currency).toUpperCase() : setting.data.currency,
        taxRate: data.taxRate !== undefined ? Number(data.taxRate) : setting.data.taxRate,
      };
      setting.markModified('data');
    }

    await setting.save();
    logActivity(req.user, 'Updated company settings', 'Setting', setting._id);
    res.json({ data: setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
