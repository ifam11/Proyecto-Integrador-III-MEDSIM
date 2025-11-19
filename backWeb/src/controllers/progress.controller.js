import { pool } from '../config/db.js';

export async function updateLessonProgress(req, res) {
  const { lesson_id, status } = req.body; // 'not_started' | 'in_progress' | 'completed'
  await pool.query(
    `INSERT INTO lesson_progress (user_id, lesson_id, status)
     VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE status=VALUES(status), updated_at=NOW()`,
    [req.user.id, lesson_id, status]
  );
  res.json({ ok: true });
}

export async function myProgress(req, res) {
  const [rows] = await pool.query(
    `SELECT lp.lesson_id, lp.status, lp.updated_at, l.title as lesson_title, m.title as module_title
     FROM lesson_progress lp
     JOIN lessons l ON l.id=lp.lesson_id
     JOIN modules m ON m.id=l.module_id
     WHERE lp.user_id=?
     ORDER BY lp.updated_at DESC`,
    [req.user.id]
  );
  res.json(rows);
}

export async function logEvent(req, res) {
  const { event_type, entity_type = null, entity_id = null, metadata = null } = req.body;
  await pool.query(
    'INSERT INTO analytic_events (user_id, event_type, entity_type, entity_id, metadata) VALUES (?,?,?,?,?)',
    [req.user.id, event_type, entity_type, entity_id, metadata ? JSON.stringify(metadata) : null]
  );
  res.json({ ok: true });
}

export async function myCompetencies(req, res) {
  const [rows] = await pool.query(
    `SELECT c.code, c.name, uc.level, uc.awarded_at
     FROM user_competencies uc
     JOIN competency_definitions c ON c.id=uc.competency_id
     WHERE uc.user_id=?`,
    [req.user.id]
  );
  res.json(rows);
}
