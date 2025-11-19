// src/routes/admin.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Solo admin puede listar
router.get('/users', requireAuth, async (req, res) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({ message: 'No autorizado' });
  }
  const [rows] = await pool.query(
    `SELECT id, email, nombre, apellido, rol, estado, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT 500`
  );
  res.json({ users: rows });
});

export default router;
