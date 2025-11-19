// src/routes/attempts.routes.js
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  startAttempt,
  saveAnswer,
  submitAttempt,
  listMyAttempts,
  getAttemptDetail,
} from '../controllers/attempts.controller.js';

const r = Router();

r.post('/:quizId/start', requireAuth, startAttempt);
r.post('/:attemptId/answer', requireAuth, saveAnswer);
r.post('/:attemptId/submit', requireAuth, submitAttempt);

r.get('/mine', requireAuth, listMyAttempts);
r.get('/:id', requireAuth, getAttemptDetail);

export default r;
