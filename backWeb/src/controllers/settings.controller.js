import { pool } from '../config/db.js';

export async function getProfile(req, res) {
  const [[row]] = await pool.query(
    'SELECT avatar_url, bio, institucion, telefono, pais, timezone FROM user_profiles WHERE user_id=?',
    [req.user.id]
  );
  res.json(row || {});
}

export async function updateProfile(req, res) {
  const { avatar_url=null, bio=null, institucion=null, telefono=null, pais=null, timezone=null } = req.body;
  await pool.query(
    `INSERT INTO user_profiles (user_id, avatar_url, bio, institucion, telefono, pais, timezone)
     VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE avatar_url=VALUES(avatar_url), bio=VALUES(bio), institucion=VALUES(institucion),
                               telefono=VALUES(telefono), pais=VALUES(pais), timezone=VALUES(timezone)`,
    [req.user.id, avatar_url, bio, institucion, telefono, pais, timezone]
  );
  res.json({ ok: true });
}

export async function getPreferences(req, res) {
  const [[row]] = await pool.query(
    'SELECT idioma, tema, notify_email, notify_push, extra_json FROM user_preferences WHERE user_id=?',
    [req.user.id]
  );
  res.json(row || {});
}

export async function updatePreferences(req, res) {
  const { idioma='es', tema='light', notify_email=1, notify_push=1, extra_json=null } = req.body;
  await pool.query(
    `INSERT INTO user_preferences (user_id, idioma, tema, notify_email, notify_push, extra_json)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE idioma=VALUES(idioma), tema=VALUES(tema), notify_email=VALUES(notify_email),
                               notify_push=VALUES(notify_push), extra_json=VALUES(extra_json)`,
    [req.user.id, idioma, tema, notify_email ? 1 : 0, notify_push ? 1 : 0, extra_json ? JSON.stringify(extra_json) : null]
  );
  res.json({ ok: true });
}

export async function getSecurity(req, res) {
  const [[row]] = await pool.query(
    'SELECT mfa_enabled, last_password_change FROM user_security WHERE user_id=?',
    [req.user.id]
  );
  res.json(row || { mfa_enabled: 0, last_password_change: null });
}

export async function updateSecurity(req, res) {
  const { mfa_enabled = 0 } = req.body;
  await pool.query(
    `INSERT INTO user_security (user_id, mfa_enabled, last_password_change)
     VALUES (?,?,NOW())
     ON DUPLICATE KEY UPDATE mfa_enabled=VALUES(mfa_enabled)`,
    [req.user.id, mfa_enabled ? 1 : 0]
  );
  res.json({ ok: true });
}

export async function listDevices(req, res) {
  const [rows] = await pool.query(
    'SELECT id, device_name, user_agent, ip_address, last_seen, revoked, created_at FROM user_devices WHERE user_id=? ORDER BY last_seen DESC, id DESC',
    [req.user.id]
  );
  res.json(rows);
}

export async function revokeDevice(req, res) {
  const { device_id } = req.body;
  await pool.query('UPDATE user_devices SET revoked=1 WHERE id=? AND user_id=?', [device_id, req.user.id]);
  res.json({ ok: true });
}
