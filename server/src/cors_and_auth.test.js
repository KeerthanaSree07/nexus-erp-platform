import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app, { isOriginAllowed, corsOptions } from './index.js';
import { getCookieOpts } from './routes/auth.js';
import { User } from './models/User.js';

describe('CORS and Origin Configuration', () => {
  it('allows the production Vercel frontend origin', () => {
    assert.equal(isOriginAllowed('https://nexus-erp-platform-client.vercel.app'), true);
  });

  it('allows production origin with accidental trailing slash', () => {
    assert.equal(isOriginAllowed('https://nexus-erp-platform-client.vercel.app/'), true);
  });

  it('allows local development origins (localhost and 127.0.0.1 on any port)', () => {
    assert.equal(isOriginAllowed('http://localhost:5173'), true);
    assert.equal(isOriginAllowed('http://localhost:3000'), true);
    assert.equal(isOriginAllowed('http://localhost:4000'), true);
    assert.equal(isOriginAllowed('http://127.0.0.1:5173'), true);
  });

  it('allows requests without origin (curl, server-to-server, health checks)', () => {
    assert.equal(isOriginAllowed(undefined), true);
    assert.equal(isOriginAllowed(''), true);
  });

  it('blocks untrusted origins', () => {
    assert.equal(isOriginAllowed('https://untrusted-domain.com'), false);
    assert.equal(isOriginAllowed('https://evil-attacker.io'), false);
    assert.equal(isOriginAllowed('http://localhost.evil.com'), false);
  });

  it('corsOptions has all required HTTP methods and headers', () => {
    assert.deepEqual(corsOptions.methods, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    assert.ok(corsOptions.allowedHeaders.includes('Content-Type'));
    assert.ok(corsOptions.allowedHeaders.includes('Authorization'));
    assert.equal(corsOptions.credentials, true);
  });
});

describe('Cookie and Credentials Options', () => {
  it('configures SameSite=None and Secure for cross-origin HTTPS in production', () => {
    const origEnv = process.env.NODE_ENV;
    const origClientOrigin = process.env.CLIENT_ORIGIN;

    process.env.CLIENT_ORIGIN = 'https://nexus-erp-platform-client.vercel.app';
    process.env.NODE_ENV = 'production';

    const opts = getCookieOpts();
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, 'none');
    assert.equal(opts.secure, true);
    assert.equal(opts.path, '/');

    process.env.NODE_ENV = origEnv;
    process.env.CLIENT_ORIGIN = origClientOrigin;
  });

  it('configures SameSite=lax for local development on HTTP', () => {
    const origEnv = process.env.NODE_ENV;
    const origClientOrigin = process.env.CLIENT_ORIGIN;

    process.env.CLIENT_ORIGIN = 'http://localhost:5173';
    process.env.NODE_ENV = 'development';

    const opts = getCookieOpts();
    assert.equal(opts.httpOnly, true);
    assert.equal(opts.sameSite, 'lax');
    assert.equal(opts.secure, false);

    process.env.NODE_ENV = origEnv;
    process.env.CLIENT_ORIGIN = origClientOrigin;
  });
});

describe('Live HTTP Preflight and Authentication Endpoints', () => {
  let server;
  let baseUrl;
  const PROD_ORIGIN = 'https://nexus-erp-platform-client.vercel.app';

  before(async () => {
    // Wait for MongoDB if connecting
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) return resolve();
        const t = setTimeout(resolve, 4000);
        mongoose.connection.once('connected', () => {
          clearTimeout(t);
          resolve();
        });
      });
    }

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  it('responds to OPTIONS preflight for /auth/login with correct CORS headers and status', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': PROD_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    const allowedMethods = res.headers.get('access-control-allow-methods') || '';
    assert.ok(allowedMethods.includes('POST'));
    assert.ok(allowedMethods.includes('OPTIONS'));
    const allowedHeaders = res.headers.get('access-control-allow-headers') || '';
    assert.ok(allowedHeaders.toLowerCase().includes('content-type'));
    assert.ok(allowedHeaders.toLowerCase().includes('authorization'));
  });

  it('responds to OPTIONS preflight for /api/auth/login with correct CORS headers', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': PROD_ORIGIN,
        'Access-Control-Request-Method': 'POST',
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  it('returns CORS headers and 401 for unauthenticated GET /auth/me', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Origin': PROD_ORIGIN,
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    const data = await res.json();
    assert.equal(data.message, 'Authentication required.');
  });

  it('returns CORS headers and 401 for unauthenticated GET /api/auth/me', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Origin': PROD_ORIGIN,
      },
    });

    assert.equal(res.status, 401);
    assert.equal(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    const data = await res.json();
    assert.equal(data.message, 'Authentication required.');
  });

  it('returns CORS headers on POST /auth/login validation error', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Origin': PROD_ORIGIN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    const data = await res.json();
    assert.equal(data.message, 'Email and password are required.');
  });

  it('does not send CORS headers for untrusted origins', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://evil-unauthorized-site.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });

  it('authenticates GET /auth/me with Bearer token if valid user exists', async () => {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ active: true });
      if (user) {
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'CHANGE_ME_use_setup_script');
        const res = await fetch(`${baseUrl}/auth/me`, {
          method: 'GET',
          headers: {
            'Origin': PROD_ORIGIN,
            'Authorization': `Bearer ${token}`,
          },
        });
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('access-control-allow-origin'), PROD_ORIGIN);
        const data = await res.json();
        assert.equal(data.user.email, user.email);
      }
    }
  });
});
