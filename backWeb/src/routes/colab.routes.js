// src/routes/colab.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/* ========== Salas grupales (is_group = 1) ========== */
// GET /api/colab/rooms
router.get('/rooms', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.created_at,
            (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messages_count
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = ? AND c.is_group = 1
     ORDER BY c.created_at DESC`,
    [userId]
  );
  res.json({ rooms: rows });
});

// GET /api/colab/rooms/:id/messages
router.get('/rooms/:id/messages', requireAuth, async (req, res) => {
  const roomId = Number(req.params.id);
  const [msgs] = await pool.query(
    `SELECT m.id, m.user_id, m.body, m.attachment_url, m.created_at
     FROM messages m
     WHERE m.conversation_id = ?
     ORDER BY m.created_at DESC
     LIMIT 100`,
    [roomId]
  );
  res.json({ messages: msgs });
});

/* ========== Mensajería directa (is_group = 0) ========== */
// GET /api/colab/direct
router.get('/direct', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.created_at
     FROM conversations c
     JOIN conversation_members cm ON cm.conversation_id = c.id
     WHERE cm.user_id = ? AND c.is_group = 0
     ORDER BY c.created_at DESC`,
    [userId]
  );
  res.json({ conversations: rows });
});

// GET /api/colab/direct/:id/messages
router.get('/direct/:id/messages', requireAuth, async (req, res) => {
  const convId = Number(req.params.id);
  const [msgs] = await pool.query(
    `SELECT m.id, m.user_id, m.body, m.attachment_url, m.created_at
     FROM messages m
     WHERE m.conversation_id = ?
     ORDER BY m.created_at DESC
     LIMIT 100`,
    [convId]
  );
  res.json({ messages: msgs });
});

export default router;
