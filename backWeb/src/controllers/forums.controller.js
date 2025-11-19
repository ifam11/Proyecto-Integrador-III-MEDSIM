// backWeb/src/controllers/forums.controller.js
import { pool } from '../config/db.js';

/** GET /api/forums */
export async function listForums(_req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT f.id, f.name, f.description, f.visibility,
              f.created_by, f.created_at,
              u.nombre AS autor_nombre, u.email AS autor_email,
              (SELECT COUNT(*) FROM forum_threads t WHERE t.forum_id = f.id) AS threads
       FROM forums f
       LEFT JOIN users u ON u.id = f.created_by
       ORDER BY f.created_at DESC`
    );
    res.json({ forums: rows });
  } catch (err) { next(err); }
}

/** GET /api/forums/:forumId/threads */
export async function listThreads(req, res, next) {
  try {
    const forumId = Number(req.params.forumId);
    const [[forum]] = await pool.query(
      'SELECT id, name, description FROM forums WHERE id = ? LIMIT 1',
      [forumId]
    );
    if (!forum) return res.status(404).json({ message: 'Foro no encontrado' });

    const [threads] = await pool.query(
      `SELECT t.id, t.title, t.created_by, t.created_at,
              u.nombre AS autor_nombre, u.email AS autor_email
       FROM forum_threads t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.forum_id = ?
       ORDER BY t.created_at DESC`,
      [forumId]
    );
    res.json({ forum, threads });
  } catch (err) { next(err); }
}

/** POST /api/forums/:forumId/threads  (auth) */
export async function createThread(req, res, next) {
  try {
    const forumId = Number(req.params.forumId);
    const { title } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Título requerido' });
    }
    // valida que exista el foro
    const [[f]] = await pool.query('SELECT id FROM forums WHERE id=? LIMIT 1',[forumId]);
    if (!f) return res.status(404).json({ message: 'Foro no encontrado' });

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autenticado' });

    const [r] = await pool.query(
      'INSERT INTO forum_threads (forum_id, title, created_by) VALUES (?,?,?)',
      [forumId, title.trim(), userId]
    );
    res.status(201).json({ id: r.insertId, forum_id: forumId, title });
  } catch (err) { next(err); }
}

/** GET /api/forums/threads/:threadId/posts */
export async function listPosts(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    const [[thread]] = await pool.query(
      `SELECT t.id, t.title, t.forum_id,
              f.name AS forum_name
       FROM forum_threads t
       JOIN forums f ON f.id = t.forum_id
       WHERE t.id = ? LIMIT 1`,
      [threadId]
    );
    if (!thread) return res.status(404).json({ message: 'Hilo no encontrado' });

    const [posts] = await pool.query(
      `SELECT p.id, p.body, p.created_at, p.user_id,
              u.nombre AS autor_nombre, u.email AS autor_email
       FROM forum_posts p
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.thread_id = ?
       ORDER BY p.created_at ASC`,
      [threadId]
    );
    res.json({ thread, posts });
  } catch (err) { next(err); }
}

/** POST /api/forums/threads/:threadId/posts  (auth) */
export async function createPost(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    const { body } = req.body || {};
    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Contenido requerido' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'No autenticado' });

    // valida que exista el hilo
    const [[t]] = await pool.query('SELECT id FROM forum_threads WHERE id=? LIMIT 1',[threadId]);
    if (!t) return res.status(404).json({ message: 'Hilo no encontrado' });

    const [r] = await pool.query(
      'INSERT INTO forum_posts (thread_id, user_id, body) VALUES (?,?,?)',
      [threadId, userId, body.trim()]
    );
    res.status(201).json({ id: r.insertId, thread_id: threadId, body });
  } catch (err) { next(err); }
}
