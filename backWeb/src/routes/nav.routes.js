// src/routes/nav.routes.js
import { Router } from 'express';
import { pool } from '../config/db.js';
import authRequired from '../middleware/authRequired.js';

const r = Router();

/* Contadores para el menú lateral */
r.get('/nav/badges', authRequired, async (req, res) => {
  const uid = req.user.id;

  // mensajes no leídos: direct + rooms
  const [[directUnread]] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM direct_messages dm
     JOIN conversation_members me
       ON me.conversation_id=dm.conversation_id AND me.user_id=?
     WHERE me.last_read_at IS NULL OR dm.created_at > me.last_read_at`,
    [uid]
  );

  const [[roomsUnread]] = await pool.query(
    `SELECT COUNT(*) AS c
     FROM room_messages rm
     JOIN room_members me ON me.room_id=rm.room_id AND me.user_id=?
     WHERE me.last_read_at IS NULL OR rm.created_at > me.last_read_at`,
    [uid]
  );

  // quizzes disponibles (publicados y sin intento creado)
  const [[quizAvail]] = await pool.query(
    `SELECT COUNT(*) AS c
       FROM quizzes q
       LEFT JOIN attempts a
         ON a.quiz_id=q.id AND a.user_id=?
      WHERE q.published=1 AND a.id IS NULL`,
    [uid]
  );

  res.json({
    notificaciones: 0,                  // si luego creas tabla notifications, cámbialo
    mensajes: (directUnread?.c || 0) + (roomsUnread?.c || 0),
    evaluacionesPendientes: quizAvail?.c || 0,
    tareas: 0
  });
});

export default r;
