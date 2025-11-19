// src/routes/index.js
import { Router } from 'express';
import authRouter from './auth.routes.js';
import dashboardRouter from './dashboard.routes.js';
import attemptsRouter from './attempts.routes.js';

// NUEVOS
import forumsRouters from './forums.routes.js';
import colabRouter from './colab.routes.js';
import gamificationRouter from './gamification.routes.js';
import reportsRouter from './reports.routes.js';
import adminRouter from './admin.routes.js';
import navRouter from './nav.routes.js';
import directRoutes from './direct.routes.js';
import roomsRoutes from './rooms.routes.js';
import quizzesRoutes from './quizzes.routes.js';


export const router = Router();

// ya las tenías
router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/attempts', attemptsRouter);

// nuevas
router.use('/forums', forumsRouters);
router.use('/colab', colabRouter);                // salas (group) + direct
router.use('/gamification', gamificationRouter);  // retos/insignias/ranking
router.use('/reports', reportsRouter);            // progreso/competencias/uso
router.use('/admin', adminRouter);                // usuarios (CRUD: aquí mínimo GET)
router.use('/nav', navRouter);             
router.use(directRoutes);     // /api/direct...
router.use(roomsRoutes);   
router.use('/quizzes', quizzesRoutes);

export default router;
