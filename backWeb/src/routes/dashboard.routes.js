import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  studentDashboard,
  teacherDashboard,
  adminDashboard
} from '../controllers/dashboard.controller.js';

const r = Router();

// Todos requieren estar logueados
r.get('/student', requireAuth, studentDashboard);
r.get('/teacher', requireAuth, teacherDashboard);
r.get('/admin',   requireAuth, adminDashboard);

export default r;
