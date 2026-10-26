import { Router } from 'express';
import { Activity } from '../models/Activity.js';
import { requireRole } from '../middleware/auth.js';

export const activityRouter = Router();

activityRouter.use(requireRole('Administrator'));

// GET /api/activity
activityRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, 'i') },
            { entity: new RegExp(q, 'i') },
            { actor: new RegExp(q, 'i') },
          ],
        }
      : {};

    const list = await Activity.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({
      data: list.map(a => ({
        id: a._id,
        name: a.name,
        entity: a.entity,
        actor: a.actor,
        createdAt: a.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
