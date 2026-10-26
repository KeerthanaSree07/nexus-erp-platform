import { Router } from 'express';
import bcrypt from 'bcrypt';
import { User } from '../models/User.js';
import { requireRole } from '../middleware/auth.js';
import { logActivity } from '../helpers/audit.js';

export const usersRouter = Router();

// Only Administrators can access user management
usersRouter.use(requireRole('Administrator'));

// GET /api/users
usersRouter.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q
      ? {
          $or: [
            { name: new RegExp(q, 'i') },
            { email: new RegExp(q, 'i') },
            { role: new RegExp(q, 'i') },
          ],
        }
      : {};
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json({
      data: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users
usersRouter.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'Sales Executive' } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 12) {
      return res.status(400).json({ message: 'Password must be at least 12 characters long.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'A user with that email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      active: true,
    });

    logActivity(req.user, `Created user account for ${user.email} (${role})`, 'User', user._id);
    res.status(201).json({
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/users/:id
usersRouter.patch('/:id', async (req, res) => {
  try {
    const { name, role, active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Safeguard: Last active administrator protection
    if (user.role === 'Administrator') {
      const willDemote = role && role !== 'Administrator';
      const willDeactivate = active === false;
      if (willDemote || willDeactivate) {
        const adminCount = await User.countDocuments({
          _id: { $ne: user._id },
          role: 'Administrator',
          active: true,
        });
        if (adminCount === 0) {
          return res.status(400).json({
            message: 'Cannot demote or deactivate the last remaining active Administrator.',
          });
        }
      }
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (active !== undefined) user.active = Boolean(active);

    await user.save();
    logActivity(req.user, `Updated user account for ${user.email}`, 'User', user._id);

    res.json({
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id
usersRouter.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.role === 'Administrator') {
      const adminCount = await User.countDocuments({
        _id: { $ne: user._id },
        role: 'Administrator',
        active: true,
      });
      if (adminCount === 0) {
        return res.status(400).json({
          message: 'Cannot delete the last remaining active Administrator.',
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);
    logActivity(req.user, `Deleted user account ${user.email}`, 'User', user._id);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
