// src/routes/gamification.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/gamification/challenges
router.get('/challenges', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.description, c.start_date, c.end_date, c.points_reward,
            COALESCE(cp.status,'no_inscrito') AS my_status,
            COALESCE(cp.progress_value,0) AS progress_value
     FROM challenges c
     LEFT JOIN challenge_participants cp
       ON cp.challenge_id = c.id AND cp.user_id = ?
     ORDER BY c.start_date DESC, c.id DESC`,
    [userId]
  );
  res.json({ challenges: rows });
});

// GET /api/gamification/badges
router.get('/badges', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT bd.code, bd.name, bd.description, bd.icon_url,
            ub.awarded_at
     FROM user_badges ub
     JOIN badge_definitions bd ON bd.id = ub.badge_id
     WHERE ub.user_id = ?
     ORDER BY ub.awarded_at DESC`,
    [userId]
  );
  res.json({ badges: rows });
});

// GET /api/gamification/leaderboard
router.get('/leaderboard', requireAuth, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT user_id, nombre, apellido, rol, total_points
     FROM v_leaderboard
     ORDER BY total_points DESC
     LIMIT 50`
  );
  res.json({ leaderboard: rows });
});

export default router;
