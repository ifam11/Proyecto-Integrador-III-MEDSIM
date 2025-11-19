// src/controllers/attempts.controller.js
import { pool } from '../config/db.js';

/**
 * Crea o reutiliza un intento "in_progress" por (quiz_id, user_id).
 * Requiere un índice único que choque solo cuando status = 'in_progress'.
 * Ejemplos:
 *  - UNIQUE KEY uq_attempt_open (quiz_id, user_id, open_key) con open_key generado.
 *  - o UNIQUE KEY uq_attempt_open (quiz_id, user_id, status) si prefieres.
 */
export async function startAttempt(req, res) {
  const quizId = Number(req.params.quizId);
  const userId = req.user.id;
  const cohortId = null;

  try {
    const sql = `
      INSERT INTO attempts (quiz_id, user_id, cohort_id, status)
      VALUES (?, ?, ?, 'in_progress')
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `;
    const [result] = await pool.query(sql, [quizId, userId, cohortId]);
    const attemptId = result.insertId;
    const reused = result.affectedRows === 2;
    return res.status(reused ? 200 : 201).json({ id: attemptId, reused });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const [rows] = await pool.query(
        `SELECT id FROM attempts
         WHERE quiz_id = ? AND user_id = ? AND status = 'in_progress' LIMIT 1`,
        [quizId, userId]
      );
      if (rows.length) return res.status(200).json({ id: rows[0].id, reused: true });
    }
    console.error(err);
    return res.status(500).json({ message: 'Error interno', detail: err.message });
  }
}

/**
 * Guarda/actualiza una respuesta (idempotente por UNIQUE attempt_id+question_id).
 * body: { questionId, optionId?, textAnswer? }
 */
export async function saveAnswer(req, res) {
  const attemptId = Number(req.params.attemptId);
  const userId = req.user.id;
  const { questionId, optionId = null, textAnswer = null } = req.body;

  try {
    // 1) Validar que el intento pertenece al usuario y está en curso
    const [A] = await pool.query(
      `SELECT a.id, a.user_id, a.status, q.id AS quiz_id
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE a.id = ?`,
      [attemptId]
    );
    if (!A.length) return res.status(404).json({ message: 'Intento no encontrado' });
    const attempt = A[0];
    if (attempt.user_id !== userId) return res.status(403).json({ message: 'No autorizado' });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'El intento no está en progreso' });
    }

    // 2) Validar que la pregunta pertenece al quiz
    const [Q] = await pool.query(
      `SELECT id, type FROM questions WHERE id = ? AND quiz_id = ?`,
      [questionId, attempt.quiz_id]
    );
    if (!Q.length) return res.status(400).json({ message: 'Pregunta inválida' });
    const qType = Q[0].type;

    // 3) Si es opción, validar opción y calcular is_correct
    let isCorrect = 0;
    if (optionId) {
      const [OP] = await pool.query(
        `SELECT id, is_correct FROM options WHERE id = ? AND question_id = ?`,
        [optionId, questionId]
      );
      if (!OP.length) return res.status(400).json({ message: 'Opción inválida' });
      isCorrect = OP[0].is_correct ? 1 : 0;
    } else if (qType === 'TRUE_FALSE') {
      // opcional: podrías exigir optionId para TRUE_FALSE
    }

    // 4) UPSERT de la respuesta
    const sql = `
      INSERT INTO responses (attempt_id, question_id, option_id, text_answer, is_correct)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        option_id = VALUES(option_id),
        text_answer = VALUES(text_answer),
        is_correct = VALUES(is_correct),
        answered_at = CURRENT_TIMESTAMP
    `;
    await pool.query(sql, [attemptId, questionId, optionId, textAnswer, isCorrect]);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error interno', detail: err.message });
  }
}

/**
 * Envía el intento: calcula score y cambia status a 'submitted'
 */
export async function submitAttempt(req, res) {
  const attemptId = Number(req.params.attemptId);
  const userId = req.user.id;

  try {
    // 1) Verificar intento
    const [A] = await pool.query(
      `SELECT a.id, a.user_id, a.status
       FROM attempts a WHERE a.id = ?`,
      [attemptId]
    );
    if (!A.length) return res.status(404).json({ message: 'Intento no encontrado' });
    const attempt = A[0];
    if (attempt.user_id !== userId) return res.status(403).json({ message: 'No autorizado' });
    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'El intento no está en progreso' });
    }

    // 2) Calcular score (suma de puntos de preguntas con respuesta correcta)
    const [S] = await pool.query(
      `SELECT COALESCE(SUM(q.points),0) AS score
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       WHERE r.attempt_id = ? AND r.is_correct = 1`,
      [attemptId]
    );
    const score = Number(S[0].score || 0);

    // 3) Cerrar intento
    await pool.query(
      `UPDATE attempts
       SET status = 'submitted', finished_at = NOW(), score = ?
       WHERE id = ?`,
      [score, attemptId]
    );

    return res.json({ ok: true, attemptId, score });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error interno', detail: err.message });
  }
}

/** Listado de mis intentos */
export async function listMyAttempts(req, res) {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT a.id, a.quiz_id, q.title AS quiz_title, a.status, a.score,
            a.started_at, a.finished_at
     FROM attempts a
     JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.user_id = ?
     ORDER BY a.started_at DESC`,
    [userId]
  );
  res.json(rows);
}

/** Detalle del intento con preguntas y opciones */
export async function getAttemptDetail(req, res) {
  const attemptId = Number(req.params.id);
  const [A] = await pool.query(
    `SELECT a.*, q.title AS quiz_title
     FROM attempts a
     JOIN quizzes q ON q.id = a.quiz_id
     WHERE a.id = ?`,
    [attemptId]
  );
  if (!A.length) return res.status(404).json({ message: 'Intento no encontrado' });

  const attempt = A[0];
  const myRole = req.user?.rol || req.user?.role;
  if (attempt.user_id !== req.user.id && !['docente', 'administrador'].includes(myRole)) {
    return res.status(403).json({ message: 'No autorizado' });
  }

  const [Q] = await pool.query(
    `SELECT qu.id, qu.stem, qu.type, qu.points, qu.order_index,
            r.id    AS response_id,
            r.option_id,
            r.text_answer,
            r.is_correct
     FROM questions qu
     LEFT JOIN responses r
       ON r.question_id = qu.id AND r.attempt_id = ?
     WHERE qu.quiz_id = ?
     ORDER BY qu.order_index, qu.id`,
    [attemptId, attempt.quiz_id]
  );

  const [OP] = await pool.query(
    `SELECT id, question_id, label, is_correct
     FROM options
     WHERE question_id IN (SELECT id FROM questions WHERE quiz_id = ?)`,
    [attempt.quiz_id]
  );

  const byQ = new Map();
  for (const q of Q) if (!byQ.has(q.id)) byQ.set(q.id, { ...q, options: [] });
  for (const o of OP) {
    const slot = byQ.get(o.question_id);
    if (slot) slot.options.push(o);
  }

  res.json({
    attempt: {
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      quiz_title: attempt.quiz_title,
      status: attempt.status,
      score: attempt.score,
      started_at: attempt.started_at,
      finished_at: attempt.finished_at,
    },
    questions: Array.from(byQ.values()),
  });
}
