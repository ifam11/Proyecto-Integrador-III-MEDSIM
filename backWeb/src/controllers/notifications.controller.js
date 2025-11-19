import { pool } from '../config/db.js';

export async function myNotifications(req, res) {
  const [rows] = await pool.query(
    'SELECT id, notif_type, title, body, action_url, is_read, created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 100',
    [req.user.id]
  );
  res.json(rows);
}

export async function markRead(req, res) {
  const { id } = req.params;
  await pool.query('UPDATE notifications SET is_read=1, read_at=NOW() WHERE id=? AND user_id=?', [id, req.user.id]);
  res.json({ ok: true });
}

export async function createNotification(req, res) {
  const { user_id, notif_type='general', title, body='', action_url=null, meta=null } = req.body;
  const [ins] = await pool.query(
    'INSERT INTO notifications (user_id, notif_type, title, body, action_url, meta) VALUES (?,?,?,?,?,?)',
    [user_id, notif_type, title, body, action_url, meta ? JSON.stringify(meta) : null]
  );
  res.status(201).json({ id: ins.insertId });
}
