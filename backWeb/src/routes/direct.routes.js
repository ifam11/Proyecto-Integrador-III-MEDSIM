// src/routes/direct.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import authRequired from '../middleware/authRequired.js';

const r = Router();

/* Inbox (mis conversaciones) */
r.get('/direct', authRequired, async (req, res) => {
  const uid = req.user.id;
  const [rows] = await pool.query(
    `SELECT c.id,
            (SELECT dm.body FROM direct_messages dm WHERE dm.conversation_id=c.id ORDER BY dm.id DESC LIMIT 1) as last_body,
            (SELECT dm.created_at FROM direct_messages dm WHERE dm.conversation_id=c.id ORDER BY dm.id DESC LIMIT 1) as last_at,
            (SELECT COUNT(*) FROM direct_messages dm
              JOIN conversation_members me ON me.conversation_id=dm.conversation_id AND me.user_id=?
             WHERE dm.conversation_id=c.id AND (me.last_read_at IS NULL OR dm.created_at > me.last_read_at)
            ) AS unread,
            JSON_ARRAYAGG(u.email) AS members
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id=c.id
     JOIN conversation_members o ON o.conversation_id=c.id AND o.user_id<>m.user_id
     JOIN users u ON u.id = o.user_id
     WHERE m.user_id=?
     GROUP BY c.id
     ORDER BY last_at DESC NULLS LAST`,
    [uid, uid]
  );
  res.json({ conversations: rows });
});

/* iniciar/abrir conversación por email */
r.post('/direct/start', authRequired, async (req, res) => {
  const uid = req.user.id;
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email requerido' });
  const [[other]] = await pool.query(`SELECT id FROM users WHERE email=?`, [email]);
  if (!other) return res.status(404).json({ message: 'Usuario no encontrado' });
  const oid = other.id;
  if (oid === uid) return res.status(400).json({ message: 'No puedes chatear contigo' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // busca conversación existente entre ambos
    const [[ex]] = await conn.query(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_members a ON a.conversation_id=c.id AND a.user_id=?
       JOIN conversation_members b ON b.conversation_id=c.id AND b.user_id=?
       LIMIT 1`,
      [uid, oid]
    );
    let cid = ex?.id;
    if (!cid) {
      const [c] = await conn.query(`INSERT INTO conversations () VALUES ()`);
      cid = c.insertId;
      await conn.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES (?,?),(?,?)`,
        [cid, uid, cid, oid]
      );
    }
    await conn.commit();
    res.status(201).json({ id: cid });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: 'Error iniciando conversación' });
  } finally {
    conn.release();
  }
});

/* mensajes de una conversación */
r.get('/direct/:id/messages', authRequired, async (req, res) => {
  const cid = Number(req.params.id);
  const uid = req.user.id;

  // autoriza que pertenezca
  const [[m]] = await pool.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?`,
    [cid, uid]
  );
  if (!m) return res.status(403).json({ message: 'No autorizado' });

  const [rows] = await pool.query(
    `SELECT dm.id, dm.sender_id, u.email, u.nombre, dm.body, dm.created_at
     FROM direct_messages dm
     JOIN users u ON u.id = dm.sender_id
     WHERE dm.conversation_id=?
     ORDER BY dm.id ASC
     LIMIT 500`,
    [cid]
  );

  // marca lectura
  await pool.query(
    `UPDATE conversation_members SET last_read_at=NOW() WHERE conversation_id=? AND user_id=?`,
    [cid, uid]
  );

  res.json({ messages: rows });
});

/* enviar mensaje */
r.post('/direct/:id/messages', authRequired, async (req, res) => {
  const cid = Number(req.params.id);
  const uid = req.user.id;
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ message: 'body requerido' });

  const [[m]] = await pool.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id=? AND user_id=?`,
    [cid, uid]
  );
  if (!m) return res.status(403).json({ message: 'No autorizado' });

  const [ins] = await pool.query(
    `INSERT INTO direct_messages (conversation_id, sender_id, body) VALUES (?,?,?)`,
    [cid, uid, body.trim()]
  );
  res.status(201).json({ id: ins.insertId });
});

export default r;
