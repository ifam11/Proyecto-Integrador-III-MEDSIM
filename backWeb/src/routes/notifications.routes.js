import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as c from '../controllers/notifications.controller.js';

const r = Router();
r.get('/', requireAuth, c.myNotifications);
r.post('/:id/read', requireAuth, c.markRead);

// Admin/Docente pueden crear notificaciones dirigidas
r.post('/', requireAuth, requireRole(['docente','administrador']), c.createNotification);
export default r;
