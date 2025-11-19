import { Router } from 'express';
import { pool } from '../config/db.js';
import authRequired from '../middleware/authRequired.js';

const router = Router();

// Mis salas grupales
router.get('/rooms', authRequired, async (req, res) => {
  const uid = req.user.id;
  const [rows] = await pool.query(
    `SELECT c.id, c.title, c.created_at
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id
     WHERE m.user_id = ? AND c.is_group = 1
     ORDER BY c.created_at DESC`,
    [uid]
  );
  res.json({ rooms: rows });
});

// Crear sala grupal {title, members:[ids]}
router.post('/rooms', authRequired, async (req, res) => {
  const uid = req.user.id;
  const { title, members } = req.body || {};
  if (!title) return res.status(400).json({ message: 'title requerido' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO conversations (is_group, title, created_by) VALUES (1, ?, ?)',
      [title, uid]
    );
    const cid = r.insertId;

    const set = new Set([uid, ...(Array.isArray(members) ? members : [])]);
    for (const id of set) {
      await conn.query(
        'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?,?,?)',
        [cid, id, id === uid ? 'owner' : 'member']
      );
    }

    await conn.commit();
    res.status(201).json({ id: cid });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: e.message });
  } finally {
    conn.release();
  }
});

// Mensajes de sala
router.get('/rooms/:id/messages', authRequired, async (req, res) => {
  const cid = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT m.id, m.user_id, u.nombre, m.body, m.attachment_url, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC
     LIMIT 500`,
    [cid]
  );
  res.json({ messages: rows });
});

// Enviar mensaje a sala {body}
router.post('/rooms/:id/messages', authRequired, async (req, res) => {
  const cid = Number(req.params.id);
  const uid = req.user.id;
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ message: 'body requerido' });

  const [r] = await pool.query(
    'INSERT INTO messages (conversation_id, user_id, body) VALUES (?,?,?)',
    [cid, uid, body]
  );
  res.status(201).json({ id: r.insertId });
});

// Conversaciones 1:1 (inbox)
router.get('/direct', authRequired, async (req, res) => {
  const uid = req.user.id;
  const [rows] = await pool.query(
    `SELECT c.id,
            u.id AS peer_id, u.nombre, u.email,
            (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
            (SELECT COUNT(*) FROM messages m
               LEFT JOIN message_reads r ON r.message_id = m.id AND r.user_id = ?
             WHERE m.conversation_id = c.id AND r.user_id IS NULL) AS unread
     FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = ?
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id <> m1.user_id
     JOIN users u ON u.id = m2.user_id
     WHERE c.is_group = 0
     ORDER BY c.id DESC`,
    [uid, uid]
  );
  res.json({ direct: rows });
});

// Abrir/crear chat 1:1 {userId}
router.post('/direct/start', authRequired, async (req, res) => {
  const uid = req.user.id;
  const { userId } = req.body || {};
  const peer = Number(userId);
  if (!peer || peer === uid) return res.status(400).json({ message: 'userId inválido' });

  // ¿ya existe?
  const [exist] = await pool.query(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_members a ON a.conversation_id = c.id AND a.user_id = ?
     JOIN conversation_members b ON b.conversation_id = c.id AND b.user_id = ?
     WHERE c.is_group = 0
     LIMIT 1`,
    [uid, peer]
  );
  if (exist.length) return res.json({ id: exist[0].id });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      'INSERT INTO conversations (is_group, title, created_by) VALUES (0, NULL, ?)',
      [uid]
    );
    const cid = r.insertId;
    await conn.query(
      'INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?,?, "owner"), (?,?,"member")',
      [cid, uid, cid, peer]
    );
    await conn.commit();
    res.status(201).json({ id: cid });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ message: e.message });
  } finally {
    conn.release();
  }
});

// Mensajes 1:1
router.get('/direct/:id/messages', authRequired, async (req, res) => {
  const cid = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT m.id, m.user_id, u.nombre, m.body, m.created_at
     FROM messages m
     JOIN users u ON u.id = m.user_id
     WHERE m.conversation_id = ?
     ORDER BY m.created_at ASC
     LIMIT 500`,
    [cid]
  );
  res.json({ messages: rows });
});

router.post('/direct/:id/messages', authRequired, async (req, res) => {
  const cid = Number(req.params.id);
  const uid = req.user.id;
  const { body } = req.body || {};
  if (!body) return res.status(400).json({ message: 'body requerido' });
  const [r] = await pool.query(
    'INSERT INTO messages (conversation_id, user_id, body) VALUES (?,?,?)',
    [cid, uid, body]
  );
  res.status(201).json({ id: r.insertId });
});

export default router;
