// ESM
import { pool } from '../config/db.js';

/* Utilidad segura para obtener un único valor numérico */
async function scalar(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  const v = rows?.[0] && Object.values(rows[0])[0];
  return Number(v ?? 0);
}

/* ---------- STUDENT ---------- */
export async function studentDashboard(req, res) {
  const userId = req.user.id;

  try {
    // Cuestionarios publicados asignados a mis cohortes (o globales)
    const [pubRows] = await pool.query(
      `SELECT COUNT(DISTINCT qa.quiz_id) AS cnt
       FROM quiz_assignments qa
       LEFT JOIN enrollments e ON (qa.cohort_id = e.cohort_id OR qa.cohort_id IS NULL)
       WHERE e.user_id = ?`, [userId]
    );
    const cuestionarios_publicados = Number(pubRows?.[0]?.cnt ?? 0);

    const intentos_en_curso = await scalar(
      `SELECT COUNT(*) FROM attempts WHERE user_id=? AND status='in_progress'`,
      [userId]
    );

    const intentos_enviados = await scalar(
      `SELECT COUNT(*) FROM attempts
       WHERE user_id=? AND status IN ('submitted','graded')`,
      [userId]
    );

    const promedio = await scalar(
      `SELECT AVG(score) AS avg FROM attempts
       WHERE user_id=? AND status IN ('submitted','graded')`,
      [userId]
    );

    const notificaciones_no_leidas = await scalar(
      `SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0`,
      [userId]
    );

    // Competencias: traducir levels a % (beginner=33, intermediate=66, advanced=100)
    const [compRows] = await pool.query(
      `SELECT cd.name AS nombre,
              CASE uc.level
                WHEN 'beginner' THEN 33
                WHEN 'intermediate' THEN 66
                WHEN 'advanced' THEN 100
                ELSE 0
              END AS valor
       FROM user_competencies uc
       JOIN competency_definitions cd ON cd.id = uc.competency_id
       WHERE uc.user_id = ?`,
      [userId]
    );

    // Learning curve (promedio por día)
    const [curveRows] = await pool.query(
      `SELECT DATE(a.started_at) AS label, AVG(a.score) AS score
       FROM attempts a
       WHERE a.user_id=? AND a.status IN ('submitted','graded')
       GROUP BY DATE(a.started_at)
       ORDER BY DATE(a.started_at) DESC
       LIMIT 10`,
      [userId]
    );

    // Próximas tareas (asignaciones futuras o sin fecha)
    const [todoRows] = await pool.query(
      `SELECT q.title AS titulo,
              qa.due_at AS due
       FROM quiz_assignments qa
       JOIN quizzes q ON q.id = qa.quiz_id
       LEFT JOIN enrollments e ON (qa.cohort_id = e.cohort_id OR qa.cohort_id IS NULL)
       WHERE e.user_id = ?
         AND (qa.due_at IS NULL OR qa.due_at >= NOW())
       ORDER BY qa.due_at IS NULL, qa.due_at
       LIMIT 8`,
      [userId]
    );

    res.json({
      cards: {
        cuestionarios_publicados,
        intentos_en_curso,
        intentos_enviados,
        promedio,
        notificaciones_no_leidas,
        competencias: compRows,
        learning_curve: curveRows.map(r => ({ label: String(r.label), score: Number(r.score ?? 0) })),
        tareas: todoRows.map(r => ({ titulo: r.titulo, due: r.due })),
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error dashboard estudiante', detail: e.message });
  }
}

/* ---------- TEACHER ---------- */
export async function teacherDashboard(req, res) {
  const teacherId = req.user.id;

  try {
    const quizzes_creados = await scalar(
      `SELECT COUNT(*) FROM quizzes WHERE created_by=?`, [teacherId]
    );

    const intentos_totales = await scalar(
      `SELECT COUNT(*) FROM attempts
       WHERE quiz_id IN (SELECT id FROM quizzes WHERE created_by=?)`,
      [teacherId]
    );

    const promedio_general = await scalar(
      `SELECT AVG(score) FROM attempts
       WHERE status IN ('submitted','graded')
         AND quiz_id IN (SELECT id FROM quizzes WHERE created_by=?)`,
      [teacherId]
    );

    const estudiantes_en_cursos = await scalar(
      `SELECT COUNT(DISTINCT e.user_id)
       FROM enrollments e
       JOIN cohorts c ON c.id = e.cohort_id
       JOIN courses co ON co.id = c.course_id
       WHERE co.created_by = ? AND e.role_in_course='estudiante'`,
      [teacherId]
    );

    // Errores comunes (top 5 preguntas con más incorrectas en mis quizzes)
    const [errRows] = await pool.query(
      `SELECT LEFT(q.stem, 60) AS nombre, COUNT(*) AS valor
       FROM responses r
       JOIN questions q ON q.id = r.question_id
       JOIN attempts a  ON a.id = r.attempt_id
       WHERE r.is_correct = 0
         AND a.quiz_id IN (SELECT id FROM quizzes WHERE created_by=?)
       GROUP BY q.id
       ORDER BY valor DESC
       LIMIT 5`,
      [teacherId]
    );

    // "Uso de recursos": proxy = intentos por quiz del docente (top 5)
    const [usoRows] = await pool.query(
      `SELECT q.title AS nombre, COUNT(*) AS valor
       FROM attempts a
       JOIN quizzes q ON q.id = a.quiz_id
       WHERE q.created_by = ?
       GROUP BY a.quiz_id
       ORDER BY valor DESC
       LIMIT 5`,
      [teacherId]
    );

    // Ranking por alumno (promedio en mis quizzes)
    const [rankRows] = await pool.query(
      `SELECT u.nombre AS alumno, AVG(a.score) AS score
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       WHERE a.status IN ('submitted','graded')
         AND a.quiz_id IN (SELECT id FROM quizzes WHERE created_by=?)
       GROUP BY a.user_id
       ORDER BY score DESC
       LIMIT 10`,
      [teacherId]
    );

    res.json({
      cards: {
        quizzes_creados,
        intentos_totales,
        promedio_general,
        estudiantes_en_cursos,
        errores_comunes: errRows.map(r => ({ nombre: r.nombre, valor: Number(r.valor) })),
        uso_recursos: usoRows.map(r => ({ nombre: r.nombre, valor: Number(r.valor) })),
        ranking: rankRows.map(r => ({ alumno: r.alumno ?? 'Sin nombre', score: Number(r.score ?? 0) })),
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error dashboard docente', detail: e.message });
  }
}

/* ---------- ADMIN ---------- */
export async function adminDashboard(_req, res) {
  try {
    const usuarios = await scalar(`SELECT COUNT(*) FROM users`);
    const cursos   = await scalar(`SELECT COUNT(*) FROM courses`);
    const quizzes  = await scalar(`SELECT COUNT(*) FROM quizzes`);
    const intentos = await scalar(`SELECT COUNT(*) FROM attempts`);
    const foros    = await scalar(`SELECT COUNT(*) FROM forums`);

    // Uso por área: courses.scope
    const [areaRows] = await pool.query(
      `SELECT scope AS nombre, COUNT(*) AS valor
       FROM courses GROUP BY scope`
    );

    // Tipos de simulación: resources.category
    const [tipoRows] = await pool.query(
      `SELECT category AS nombre, COUNT(*) AS valor
       FROM resources GROUP BY category`
    );

    // "Inventario": muestra últimos modelos 3D como proxies de equipos
    const [invRows] = await pool.query(
      `SELECT title AS equipo, 'OK' AS estado
       FROM models3d ORDER BY created_at DESC LIMIT 5`
    );

    // Próximas cohortes (como parte de planificación/calendario)
    const [cohRows] = await pool.query(
      `SELECT name, start_date FROM cohorts
       WHERE start_date IS NOT NULL AND start_date >= CURDATE()
       ORDER BY start_date LIMIT 8`
    );

    res.json({
      cards: {
        usuarios, cursos, quizzes, intentos, foros,
        uso_por_area: areaRows.map(r => ({ nombre: r.nombre, valor: Number(r.valor) })),
        tipos_simulacion: tipoRows.map(r => ({ nombre: r.nombre, valor: Number(r.valor) })),
        inventario: invRows.map(r => ({ equipo: r.equipo, estado: r.estado })),
        proximas_cohortes: cohRows.map(r => ({ name: r.name, start_date: r.start_date })),
      }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Error dashboard admin', detail: e.message });
  }
}
