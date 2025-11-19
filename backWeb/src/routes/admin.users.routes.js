// src/routes/admin.users.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const requireAdmin = (req, res, next) => {
  const rol = req.user?.rol || req.user?.role;
  if (rol !== 'administrador') return res.status(403).json({ message: 'Requiere administrador' });
  next();
};

router.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, nombre, email, rol, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 500`
  );
  res.json(rows);
});

router.post('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, email, rol } = req.body || {};
  if (!email || !rol) return res.status(400).json({ message: 'email y rol son requeridos' });
  const [r] = await pool.query(
    `INSERT INTO users (nombre, email, rol) VALUES (?,?,?)`,
    [nombre || '', email, rol]
  );
  res.status(201).json({ id: r.insertId });
});

router.put('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, email, rol } = req.body || {};
  await pool.query(
    `UPDATE users SET nombre=COALESCE(?,nombre), email=COALESCE(?,email), rol=COALESCE(?,rol) WHERE id=?`,
    [nombre, email, rol, id]
  );
  res.json({ ok: true });
});

router.delete('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await pool.query(`DELETE FROM users WHERE id=?`, [id]);
  res.json({ ok: true });
});

export default router;
