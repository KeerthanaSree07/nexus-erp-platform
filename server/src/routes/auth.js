import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { User } from '../models/User.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../helpers/audit.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_use_setup_script';

export const getCookieOpts = () => {
  const isHttps =
    process.env.NODE_ENV === 'production' ||
    (process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN.startsWith('https://')) ||
    process.env.COOKIE_SECURE === 'true';

  return {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: Boolean(isHttps),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  };
};

export const authRouter = Router();

// Rate-limit login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 15,
  message: { message: 'Too many login attempts. Please wait and try again.' },
});

// Rate-limit registration attempts
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  message: { message: 'Too many registration attempts. Please wait and try again.' },
});

// POST /api/auth/register
authRouter.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();

    if (trimmedName.length < 2) {
      return res.status(400).json({ message: 'Please enter a valid full name.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    // Check if email already registered
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY: Strictly enforce normal user role only ('Sales Executive').
    // Never allow client to specify or escalate to 'Administrator'.
    const user = await User.create({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      role: 'Sales Executive',
      active: true,
    });

    logActivity(user, 'Registered new account', 'User', user._id);

    res.status(201).json({
      message: 'Account created successfully. You can now sign in.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }
    res.status(500).json({ message: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!user.active) return res.status(403).json({ message: 'Account is disabled.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, getCookieOpts());

    logActivity(user, 'Signed in', 'User', user._id);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', getCookieOpts());
  res.json({ message: 'Signed out.' });
});

// GET /api/auth/me — restore session
authRouter.get('/me', authenticate, (req, res) => {
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, email: u.email, role: u.role } });
});
