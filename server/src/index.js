import 'dotenv/config';
import dns from 'dns';

// Ensure DNS SRV lookup succeeds for Atlas clusters on networks with restricted local DNS
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Use system default if setServers is unavailable
}

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { inventoryRouter } from './routes/inventory.js';
import { ordersRouter } from './routes/orders.js';
import { purchasesRouter } from './routes/purchases.js';
import { customersRouter } from './routes/customers.js';
import { vendorsRouter } from './routes/vendors.js';
import { employeesRouter } from './routes/employees.js';
import { leavesRouter } from './routes/leaves.js';
import { payrollRouter } from './routes/payroll.js';
import { expensesRouter } from './routes/expenses.js';
import { paymentsRouter } from './routes/payments.js';
import { financeRouter } from './routes/finance.js';
import { settingsRouter } from './routes/settings.js';
import { analyticsRouter } from './routes/analytics.js';
import { usersRouter } from './routes/users.js';
import { activityRouter } from './routes/activity.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// ── Middleware ───────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin === CLIENT_ORIGIN) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS'));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// ── Database readiness check ──────────────────────────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path === '/health') {
    return res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
  }
  // Allow logout even if DB is disconnected
  if (req.path === '/auth/logout') {
    return next();
  }
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        'Database connection not established. Please check MONGODB_URI in server/.env.',
    });
  }
  next();
});

// ── Public routes ───────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

// ── Protected routes ────────────────────────────────────────────────────
app.use('/api/products', authenticate, productsRouter);
app.use('/api/inventory', authenticate, inventoryRouter);
app.use('/api/orders', authenticate, ordersRouter);
app.use('/api/purchases', authenticate, purchasesRouter);
app.use('/api/customers', authenticate, customersRouter);
app.use('/api/vendors', authenticate, vendorsRouter);
app.use('/api/employees', authenticate, employeesRouter);
app.use('/api/leaves', authenticate, leavesRouter);
app.use('/api/payroll', authenticate, payrollRouter);
app.use('/api/expenses', authenticate, expensesRouter);
app.use('/api/payments', authenticate, paymentsRouter);
app.use('/api/finance', authenticate, financeRouter);
app.use('/api/settings', authenticate, settingsRouter);
app.use('/api/analytics', authenticate, analyticsRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/activity', authenticate, activityRouter);


// ── Error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-erp';

const server = app.listen(PORT, () => {
  console.log(`✓ Nexus ERP API listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`✗ Port ${PORT} is already in use. Please free port ${PORT} or stop the other process.`);
  } else {
    console.error('✗ Server error:', err.message);
  }
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

mongoose.connection.on('error', (err) => {
  console.warn(`! MongoDB event error: ${err.message}`);
});

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('✓ Connected to MongoDB');
  })
  .catch((err) => {
    console.warn(`! MongoDB connection pending (${err.message}). API running in waiting mode.`);
    console.warn('! Paste your MongoDB Atlas URI into server/.env to enable live records.');
  });

export default app;
