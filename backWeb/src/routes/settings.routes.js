import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/settings.controller.js';

const r = Router();
r.get('/profile', requireAuth, c.getProfile);
r.put('/profile', requireAuth, c.updateProfile);
r.get('/preferences', requireAuth, c.getPreferences);
r.put('/preferences', requireAuth, c.updatePreferences);
r.get('/security', requireAuth, c.getSecurity);
r.put('/security', requireAuth, c.updateSecurity);
r.get('/devices', requireAuth, c.listDevices);
r.post('/devices/revoke', requireAuth, c.revokeDevice);
export default r;
