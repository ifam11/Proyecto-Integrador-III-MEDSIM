// src/routes/rooms.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import authRequired from '../middleware/authRequired.js';

const r = Router();

/* mis salas */
r.get('/rooms', authRequired, async (req, res) => {
  const uid = req.user.id;
  const [rows] = await pool.query(
    `SELECT r.id, r.name, r.created_by,
            (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id=r.id) AS members,
            (SELECT rm2.role FROM room_members rm2 WHERE rm2.room_id=r.id AND rm2.user_id=?) AS my_role,
            (SELECT COUNT(*) FROM room_messages msg
               JOIN room_members me ON me.room_id=msg.room_id AND me.user_id=?
             WHERE msg.room_id=r.id AND (me.last_read_at IS NULL OR msg.created_at > me.last_read_at)
            ) AS unread
     FROM rooms r
     JOIN room_members rm ON rm.room_id=r.id AND rm.user_id=?
     ORDER BY r.created_at DESC`,
    [uid, uid, uid]
  );
  res.json({ rooms: rows });
});

/* crear sala (docente/admin) */
r.post('/rooms', authRequired, async (req, res) => {
  const role = req.user?.rol || req.user?.role;
  if (!['docente', 'administrador'].includes(role)) {
    return res.status(403).json({ message: 'Solo docente/administrador' });
  }
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ message: 'name requerido' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query(`INSERT INTO rooms (name, created_by) VALUES (?,?)`, [name, req.user.id]);
    await conn.query(
      `INSERT INTO room_members (room_id, user_id, role) VALUES (?,?, 'owner')`,
      [ins.insertId, req.user.id]
    );
    await conn.commit();
    res.status(201).json({ id: ins.insertId });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: 'Error creando sala' });
  } finally {
    conn.release();
  }
});

/* invitar por email (owner) */
r.post('/rooms/:id/invite', authRequired, async (req, res) => {
  const rid = Number(req.params.id);
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email requerido' });

  // debe ser owner
  const [[owner]] = await pool.query(
    `SELECT 1 FROM room_members WHERE room_id=? AND user_id=? AND role='owner'`,
    [rid, req.user.id]
  );
  if (!owner) return res.status(403).json({ message: 'Solo owner puede invitar' });

  const [[u]] = await pool.query(`SELECT id FROM users WHERE email=?`, [email]);
  if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });

  await pool.query(
    `INSERT IGNORE INTO room_members (room_id, user_id, role) VALUES (?,?, 'member')`,
    [rid, u.id]
  );

  res.json({ ok: true });
});

/* mensajes de sala */
r.get('/rooms/:id/messages', authRequired, async (req, res) => {
  const rid = Number(req.params.id);
  const uid = req.user.id;

  const [[m]] = await pool.query(
    `SELECT 1 FROM room_members WHERE room_id=? AND user_id=?`,
    [rid, uid]
  );
  if (!m) return res.status(403).json({ message: 'No perteneces a la sala' });

  const [rows] = await pool.query(
    `SELECT rm.id, rm.user_id, u.email, u.nombre, rm.body, rm.created_at
     FROM room_messages rm
     JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id=?
     ORDER BY rm.id ASC
     LIMIT 500`,
    [rid]
  );

  await pool.query(
    `UPDATE room_members SET last_read_at=NOW() WHERE room_id=? AND user_id=?`,
    [rid, uid]
  );

  res.json({ messages: rows });
});

/* enviar mensaje a sala */
r.post('/rooms/:id/messages', authRequired, async (req, res) => {
  const rid = Number(req.params.id);
  const uid = req.user.id;
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ message: 'body requerido' });

  const [[m]] = await pool.query(
    `SELECT 1 FROM room_members WHERE room_id=? AND user_id=?`,
    [rid, uid]
  );
  if (!m) return res.status(403).json({ message: 'No perteneces a la sala' });

  const [ins] = await pool.query(
    `INSERT INTO room_messages (room_id, user_id, body) VALUES (?,?,?)`,
    [rid, uid, body.trim()]
  );
  res.status(201).json({ id: ins.insertId });
});

export default r;
