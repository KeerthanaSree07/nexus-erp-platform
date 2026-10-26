import { Activity } from '../models/Activity.js';

/** Log an audit event (fire-and-forget). */
export function logActivity(user, action, entity = '', entityId = '') {
  Activity.create({
    name: action,
    entity,
    entityId: String(entityId),
    actor: user?.name || 'System',
    actorId: user?._id,
  }).catch(() => {});       // never block the request
}
