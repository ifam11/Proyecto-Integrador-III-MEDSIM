// src/routes/quizzes.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import { authRequired } from '../middleware/authRequired.js';

const router = Router();

// helper: solo docente/admin
function staffOnly(req, res, next) {
  const rol = req.user?.rol;
  if (rol === 'docente' || rol === 'administrador') return next();
  return res.status(403).json({ message: 'No autorizado' });
}

// GET /api/quizzes  (estudiante ve solo publicados; staff ve todos)
router.get('/', authRequired, async (req, res) => {
  try {
    const rol = req.user?.rol;
    const isStaff = rol === 'docente' || rol === 'administrador';

    const sql = isStaff
      ? 'SELECT id, title, description, published FROM quizzes ORDER BY id DESC'
      : 'SELECT id, title, description, published FROM quizzes WHERE published = 1 ORDER BY id DESC';

    const [rows] = await pool.query(sql);
    return res.json({ quizzes: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno', detail: e.message });
  }
});

// GET /api/quizzes/:id
router.get('/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await pool.query(
      'SELECT id, title, description, published FROM quizzes WHERE id=? LIMIT 1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Quiz no encontrado' });
    return res.json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno', detail: e.message });
  }
});

// POST /api/quizzes (crear) — staff only
router.post('/', authRequired, staffOnly, async (req, res) => {
  try {
    const { title, description = '', published = false } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'title es requerido' });
    }
    const [result] = await pool.query(
      'INSERT INTO quizzes (title, description, published) VALUES (?,?,?)',
      [String(title).trim(), String(description || ''), published ? 1 : 0]
    );
    return res.status(201).json({ id: result.insertId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno', detail: e.message });
  }
});

// PATCH /api/quizzes/:id — staff only
router.patch('/:id', authRequired, staffOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = [];
    const values = [];

    if ('title' in req.body) {
      fields.push('title=?'); values.push(String(req.body.title || '').trim());
    }
    if ('description' in req.body) {
      fields.push('description=?'); values.push(String(req.body.description || ''));
    }
    if ('published' in req.body) {
      fields.push('published=?'); values.push(req.body.published ? 1 : 0);
    }
    if (!fields.length) return res.status(400).json({ message: 'Nada que actualizar' });

    const sql = `UPDATE quizzes SET ${fields.join(', ')} WHERE id=?`;
    values.push(id);

    const [r] = await pool.query(sql, values);
    if (!r.affectedRows) return res.status(404).json({ message: 'Quiz no encontrado' });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno', detail: e.message });
  }
});

// DELETE /api/quizzes/:id — staff only
router.delete('/:id', authRequired, staffOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [r] = await pool.query('DELETE FROM quizzes WHERE id=?', [id]);
    if (!r.affectedRows) return res.status(404).json({ message: 'Quiz no encontrado' });
    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Error interno', detail: e.message });
  }
});

export default router;
