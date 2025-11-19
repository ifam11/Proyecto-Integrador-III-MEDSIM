import { pool } from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function register(req, res) {
  const { email, password, nombre = null, apellido = null, rol = 'estudiante' } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email y password requeridos' });
  const [exists] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists.length) return res.status(409).json({ message: 'Email ya registrado' });

  const hash = await bcrypt.hash(password, 10);
  const [ins] = await pool.query(
    'INSERT INTO users (email, password_hash, nombre, apellido, rol) VALUES (?,?,?,?,?)',
    [email, hash, nombre, apellido, rol]
  );
  const userId = ins.insertId;

  await pool.query('INSERT INTO user_preferences (user_id) VALUES (?)', [userId]);
  await pool.query('INSERT INTO user_profiles (user_id) VALUES (?)', [userId]);

  return res.status(201).json({ id: userId, email, rol });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email=? AND estado="activo" LIMIT 1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

  const token = jwt.sign({ id: user.id, email: user.email, rol: user.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '1d'
  });
  return res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, apellido: user.apellido, rol: user.rol } });
}

export async function me(req, res) {
  const [users] = await pool.query(
    'SELECT id, email, nombre, apellido, rol, estado, created_at FROM users WHERE id=?',
    [req.user.id]
  );
  const user = users[0];
  const [[prefs]] = await pool.query('SELECT idioma, tema, notify_email, notify_push FROM user_preferences WHERE user_id=?', [req.user.id]);
  const [[prof]] = await pool.query('SELECT avatar_url, bio, institucion, telefono, pais, timezone FROM user_profiles WHERE user_id=?', [req.user.id]);
  res.json({ user, preferences: prefs || {}, profile: prof || {} });
}
