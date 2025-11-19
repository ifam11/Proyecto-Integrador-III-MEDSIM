// src/routes/messages.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

/** Salas grupales */
router.get('/rooms', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, created_at FROM rooms ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /rooms', e);
    res.json([]);
  }
});

router.get('/rooms/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [[room]] = await pool.query(
      `SELECT id, name, created_at FROM rooms WHERE id=?`,
      [id]
    );
    const [msgs] = await pool.query(
      `SELECT m.id, m.content, m.created_at,
              u.id as author_id, u.nombre as author_name
       FROM room_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.room_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json({ room: room || null, messages: msgs });
  } catch (e) {
    console.error('GET /rooms/:id', e);
    res.json({ room: null, messages: [] });
  }
});

/** Conversaciones directas */
router.get('/direct', requireAuth, async (req, res) => {
  const me = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT c.id, u.id AS peer_id, u.nombre AS peer_name
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.user1_id=? THEN c.user2_id ELSE c.user1_id END
       WHERE c.user1_id=? OR c.user2_id=?`,
      [me, me, me]
    );
    res.json(rows);
  } catch (e) {
    console.error('GET /direct', e);
    res.json([]);
  }
});

router.get('/direct/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [[conv]] = await pool.query(
      `SELECT id, user1_id, user2_id FROM conversations WHERE id=?`,
      [id]
    );
    const [msgs] = await pool.query(
      `SELECT m.id, m.content, m.created_at,
              u.id as author_id, u.nombre as author_name
       FROM messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json({ conversation: conv || null, messages: msgs });
  } catch (e) {
    console.error('GET /direct/:id', e);
    res.json({ conversation: null, messages: [] });
  }
});

export default router;
