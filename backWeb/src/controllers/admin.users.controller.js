import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';

export async function listUsers(req, res) {
  const { page=1, limit=20, search='' } = req.query;
  const off = (Number(page)-1)*Number(limit);
  const like = `%${search}%`;
  const [rows] = await pool.query(
    `SELECT id, email, nombre, apellido, rol, estado, created_at
     FROM users
     WHERE email LIKE ? OR nombre LIKE ? OR apellido LIKE ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [like, like, like, Number(limit), off]
  );
  const [[{ c }]] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM users
     WHERE email LIKE ? OR nombre LIKE ? OR apellido LIKE ?`,
    [like, like, like]
  );
  res.json({ data: rows, total: c });
}

export async function getUser(req, res) {
  const id = Number(req.params.id);
  const [rows] = await pool.query(
    `SELECT id, email, nombre, apellido, rol, estado, created_at FROM users WHERE id=?`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
  res.json(rows[0]);
}

export async function createUser(req, res) {
  const { email, password, nombre='', apellido='', rol='estudiante' } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    `INSERT INTO users (email, password_hash, nombre, apellido, rol) VALUES (?,?,?,?,?)`,
    [email, hash, nombre, apellido, rol]
  );
  res.status(201).json({ id: r.insertId });
}

export async function updateUser(req, res) {
  const id = Number(req.params.id);
  const { email, nombre, apellido, rol, password } = req.body;
  let sql = `UPDATE users SET 
               email=COALESCE(?, email),
               nombre=COALESCE(?, nombre),
               apellido=COALESCE(?, apellido),
               rol=COALESCE(?, rol)
             WHERE id=?`;
  const params = [email ?? null, nombre ?? null, apellido ?? null, rol ?? null, id];
  await pool.query(sql, params);
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE users SET password_hash=? WHERE id=?`, [hash, id]);
  }
  res.json({ ok: true });
}

export async function updateStatus(req, res) {
  const id = Number(req.params.id);
  const { estado } = req.body; // 'activo' | 'suspendido'
  await pool.query(`UPDATE users SET estado=? WHERE id=?`, [estado, id]);
  res.json({ ok: true });
}

export async function removeUser(req, res) {
  const id = Number(req.params.id);
  await pool.query(`DELETE FROM users WHERE id=?`, [id]);
  res.json({ ok: true });
}
