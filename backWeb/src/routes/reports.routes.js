// src/routes/reports.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/* Progreso del usuario autenticado */
// GET /api/reports/me/progress
router.get('/me/progress', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const [[summary]] = await pool.query(
    `SELECT
        COUNT(*)                         AS attempts_total,
        SUM(status='submitted')          AS attempts_submitted,
        SUM(status='graded')             AS attempts_graded,
        SUM(status='in_progress')        AS attempts_in_progress,
        ROUND(AVG(score),2)              AS avg_score
     FROM attempts
     WHERE user_id = ?`,
    [userId]
  );

  const [series] = await pool.query(
    `SELECT DATE(started_at) AS day,
            COUNT(*) AS attempts,
            ROUND(AVG(score),2) AS avg_score
     FROM attempts
     WHERE user_id = ?
     GROUP BY DATE(started_at)
     ORDER BY day ASC
     LIMIT 90`,
    [userId]
  );

  res.json({ summary, series });
});

/* Competencias */
// GET /api/reports/competencies
router.get('/competencies', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT cd.code, cd.name, cd.description,
            COALESCE(uc.level,'beginner') AS level,
            uc.evidence, uc.awarded_at
     FROM competency_definitions cd
     LEFT JOIN user_competencies uc
       ON uc.competency_id = cd.id AND uc.user_id = ?
     ORDER BY cd.name ASC`,
    [userId]
  );
  res.json({ items: rows });
});

/* Uso de la plataforma (agregado) */
// GET /api/reports/usage
router.get('/usage', requireAuth, async (_req, res) => {
  const [[totals]] = await pool.query(
    `SELECT
        (SELECT COUNT(*) FROM users)    AS users,
        (SELECT COUNT(*) FROM courses)  AS courses,
        (SELECT COUNT(*) FROM quizzes)  AS quizzes,
        (SELECT COUNT(*) FROM attempts) AS attempts`
  );

  const [byDay] = await pool.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS events
     FROM analytic_events
     GROUP BY DATE(created_at)
     ORDER BY day ASC
     LIMIT 90`
  );

  res.json({ totals, byDay });
});

export default router;
