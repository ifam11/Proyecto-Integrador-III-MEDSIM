import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as c from '../controllers/progress.controller.js';

const r = Router();
r.post('/lesson', requireAuth, c.updateLessonProgress);
r.get('/me', requireAuth, c.myProgress);
r.post('/event', requireAuth, c.logEvent);
r.get('/competencies/me', requireAuth, c.myCompetencies);
export default r;
