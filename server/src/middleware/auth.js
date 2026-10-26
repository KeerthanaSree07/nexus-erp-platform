import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_use_setup_script';

/** Verify the JWT from the `token` cookie and attach `req.user`. */
export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.slice(7).trim();
    }
    if (!token) return res.status(401).json({ message: 'Authentication required.' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) return res.status(401).json({ message: 'Session expired or account disabled.' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }
}

/** Factory: require one of the listed roles. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for your role.' });
    }
    next();
  };
}
