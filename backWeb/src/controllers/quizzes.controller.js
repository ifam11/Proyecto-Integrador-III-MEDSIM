import { pool } from '../config/db.js';

// listar (ya lo tenías)
export async function listQuizzes(req, res) {
  const [rows] = await pool.query(
    `SELECT q.id, q.title, q.scope, q.is_published, q.created_at,
            (SELECT COUNT(*) FROM questions qq WHERE qq.quiz_id = q.id) AS questions_count
     FROM quizzes q
     ORDER BY q.created_at DESC`
  );
  res.json(rows);
}

export async function getQuizById(req, res) {
  const id = Number(req.params.id);
  const [quizRows] = await pool.query(
    `SELECT id, title, scope, is_published, created_at FROM quizzes WHERE id=?`,
    [id]
  );
  if (!quizRows.length) return res.status(404).json({ message: 'Quiz no encontrado' });

  const [qs] = await pool.query(
    `SELECT id, stem, type, points, order_index
     FROM questions WHERE quiz_id=? ORDER BY order_index, id`,
    [id]
  );
  const ids = qs.map(q => q.id);
  let ops = [];
  if (ids.length) {
    const [o] = await pool.query(
      `SELECT id, question_id, label, is_correct
       FROM options WHERE question_id IN (${ids.map(()=>'?').join(',')})`,
      ids
    );
    ops = o;
  }
  const byQ = new Map(qs.map(q => [q.id, { ...q, options: [] }]));
  for (const op of ops) byQ.get(op.question_id)?.options.push(op);

  res.json({ quiz: quizRows[0], questions: Array.from(byQ.values()) });
}

export async function createQuiz(req, res) {
  const { title, scope = 'mixto', is_published = 0 } = req.body;
  const userId = req.user.id;
  const [r] = await pool.query(
    `INSERT INTO quizzes (title, scope, is_published, created_by) VALUES (?,?,?,?)`,
    [title, scope, is_published ? 1 : 0, userId]
  );
  res.status(201).json({ id: r.insertId });
}

export async function updateQuiz(req, res) {
  const id = Number(req.params.id);
  const { title, scope, is_published } = req.body;
  await pool.query(
    `UPDATE quizzes SET
      title = COALESCE(?, title),
      scope = COALESCE(?, scope),
      is_published = COALESCE(?, is_published)
     WHERE id = ?`,
    [title ?? null, scope ?? null, is_published ?? null, id]
  );
  res.json({ ok: true });
}

export async function addQuestion(req, res) {
  const quizId = Number(req.params.id);
  const { stem, type = 'MCQ', points = 1, order_index = 0 } = req.body;
  const [r] = await pool.query(
    `INSERT INTO questions (quiz_id, stem, type, points, order_index)
     VALUES (?,?,?,?,?)`,
    [quizId, stem, type, points, order_index]
  );
  res.status(201).json({ id: r.insertId });
}

export async function updateQuestion(req, res) {
  const id = Number(req.params.id);
  const { stem, type, points, order_index } = req.body;
  await pool.query(
    `UPDATE questions SET
      stem = COALESCE(?, stem),
      type = COALESCE(?, type),
      points = COALESCE(?, points),
      order_index = COALESCE(?, order_index)
     WHERE id=?`,
    [stem ?? null, type ?? null, points ?? null, order_index ?? null, id]
  );
  res.json({ ok: true });
}

export async function addOption(req, res) {
  const qId = Number(req.params.id);
  const { label, is_correct = 0 } = req.body;
  const [r] = await pool.query(
    `INSERT INTO options (question_id, label, is_correct) VALUES (?,?,?)`,
    [qId, label, is_correct ? 1 : 0]
  );
  res.status(201).json({ id: r.insertId });
}

export async function updateOption(req, res) {
  const id = Number(req.params.id);
  const { label, is_correct } = req.body;
  await pool.query(
    `UPDATE options SET
      label = COALESCE(?, label),
      is_correct = COALESCE(?, is_correct)
     WHERE id=?`,
    [label ?? null, is_correct ?? null, id]
  );
  res.json({ ok: true });
}

// 🌱 Semillas (3 cuestionarios con preguntas/opciones) - idempotente por título
export async function seedSamples(req, res) {
  const userId = req.user.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const samples = [
      {
        title: 'Anatomía del árbol traqueobronquial',
        scope: 'anatomia',
        questions: [
          {
            stem: '¿Cuál es el epitelio típico de la tráquea?',
            type: 'MCQ',
            points: 1,
            options: [
              { label: 'Epitelio escamoso simple', ok: 0 },
              { label: 'Epitelio pseudoestratificado ciliado', ok: 1 },
              { label: 'Epitelio cúbico simple', ok: 0 },
              { label: 'Epitelio transicional', ok: 0 },
            ],
          },
          {
            stem: 'Los anillos traqueales son...',
            type: 'MCQ',
            points: 1,
            options: [
              { label: 'Hueso compacto', ok: 0 },
              { label: 'Cartílago hialino incompleto', ok: 1 },
              { label: 'Cartílago elástico completo', ok: 0 },
            ],
          },
        ],
      },
      {
        title: 'Histología del alveolo pulmonar',
        scope: 'histologia',
        questions: [
          {
            stem: 'Los neumocitos tipo II secretan:',
            type: 'MCQ',
            points: 1,
            options: [
              { label: 'Moco', ok: 0 },
              { label: 'Surfactante', ok: 1 },
              { label: 'Colágeno', ok: 0 },
            ],
          },
          {
            stem: '¿Qué célula predomina en la barrera hemato-aire?',
            type: 'MCQ',
            points: 1,
            options: [
              { label: 'Neumocito tipo I', ok: 1 },
              { label: 'Macrófago alveolar', ok: 0 },
              { label: 'Célula caliciforme', ok: 0 },
            ],
          },
        ],
      },
      {
        title: 'Fisiología del intercambio gaseoso',
        scope: 'mixto',
        questions: [
          {
            stem: 'El gradiente principal que mueve el O₂ desde el alveolo a la sangre es:',
            type: 'MCQ',
            points: 1,
            options: [
              { label: 'Gradiente de presión parcial de O₂', ok: 1 },
              { label: 'Bomba Na⁺/K⁺', ok: 0 },
            ],
          },
        ],
      },
    ];

    for (const s of samples) {
      const [ex] = await conn.query(`SELECT id FROM quizzes WHERE title=?`, [s.title]);
      let quizId = ex[0]?.id;
      if (!quizId) {
        const [qr] = await conn.query(
          `INSERT INTO quizzes (title, scope, is_published, created_by)
           VALUES (?,?,1,?)`,
          [s.title, s.scope, userId]
        );
        quizId = qr.insertId;
        let idx = 0;
        for (const q of s.questions) {
          const [qr2] = await conn.query(
            `INSERT INTO questions (quiz_id, stem, type, points, order_index)
             VALUES (?,?,?,?,?)`,
            [quizId, q.stem, q.type, q.points, idx++]
          );
          for (const op of q.options) {
            await conn.query(
              `INSERT INTO options (question_id, label, is_correct) VALUES (?,?,?)`,
              [qr2.insertId, op.label, op.ok ? 1 : 0]
            );
          }
        }
      }
    }

    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ message: 'Error al sembrar', detail: e.message });
  } finally {
    conn.release();
  }
}
