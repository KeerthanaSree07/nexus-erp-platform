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
const HOST = '0.0.0.0';
const PRODUCTION_CLIENT_ORIGIN = 'https://nexus-erp-platform-client.vercel.app';

// Normalize origin strings (trim and remove trailing slashes)
const normalizeOrigin = (url) => (url ? url.trim().replace(/\/+$/, '') : '');

// Parse comma-separated or single CLIENT_ORIGIN from environment
const configuredOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedOrigins = new Set([
  normalizeOrigin(PRODUCTION_CLIENT_ORIGIN),
  ...configuredOrigins,
]);

export const isOriginAllowed = (origin) => {
  // Allow requests without Origin (e.g. mobile apps, curl, same-origin, server-to-server)
  if (!origin) return true;
  const cleanOrigin = normalizeOrigin(origin);
  if (allowedOrigins.has(cleanOrigin)) return true;
  // Allow local development and testing on localhost or 127.0.0.1 (any port)
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// ── Middleware ───────────────────────────────────────────────────────────
// CORS must execute before all API routes and auth middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// ── Database readiness check ──────────────────────────────────────────────
app.use((req, res, next) => {
  // Never block OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }
  if (req.path === '/health' || req.path === '/api/health') {
    return res.json({
      status: 'ok',
      db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
  }
  // Allow logout even if DB is disconnected
  if (req.path === '/auth/logout' || req.path === '/api/auth/logout') {
    return next();
  }
  // Allow unauthenticated /auth/me checks to return 401 without waiting for DB
  if (
    (req.path === '/auth/me' || req.path === '/api/auth/me') &&
    !req.cookies?.token &&
    !req.headers.authorization
  ) {
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
app.use(['/api/auth', '/auth'], authRouter);

// ── Protected routes ────────────────────────────────────────────────────
app.use(['/api/products', '/products'], authenticate, productsRouter);
app.use(['/api/inventory', '/inventory'], authenticate, inventoryRouter);
app.use(['/api/orders', '/orders'], authenticate, ordersRouter);
app.use(['/api/purchases', '/purchases'], authenticate, purchasesRouter);
app.use(['/api/customers', '/customers'], authenticate, customersRouter);
app.use(['/api/vendors', '/vendors'], authenticate, vendorsRouter);
app.use(['/api/employees', '/employees'], authenticate, employeesRouter);
app.use(['/api/leaves', '/leaves'], authenticate, leavesRouter);
app.use(['/api/payroll', '/payroll'], authenticate, payrollRouter);
app.use(['/api/expenses', '/expenses'], authenticate, expensesRouter);
app.use(['/api/payments', '/payments'], authenticate, paymentsRouter);
app.use(['/api/finance', '/finance'], authenticate, financeRouter);
app.use(['/api/settings', '/settings'], authenticate, settingsRouter);
app.use(['/api/analytics', '/analytics'], authenticate, analyticsRouter);
app.use(['/api/users', '/users'], authenticate, usersRouter);
app.use(['/api/activity', '/activity'], authenticate, activityRouter);


// ── Error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus-erp';

const isTestEnv = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));

let server;
if (!isTestEnv) {
  server = app.listen(PORT, HOST, () => {
    console.log(`✓ Nexus ERP API listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`✗ Port ${PORT} is already in use. Please free port ${PORT} or stop the other process.`);
    } else {
      console.error('✗ Server error:', err.message);
    }
  });

  process.on('SIGTERM', () => {
    server?.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    server?.close(() => process.exit(0));
  });
}

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
