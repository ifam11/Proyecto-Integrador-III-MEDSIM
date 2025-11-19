import { pool } from '../config/db.js';

export async function leaderboard(_req, res) {
  const [rows] = await pool.query('SELECT * FROM v_leaderboard LIMIT 100');
  res.json(rows);
}

export async function listBadges(_req, res) {
  const [rows] = await pool.query('SELECT id, code, name, description, icon_url, points_reward FROM badge_definitions');
  res.json(rows);
}

export async function myBadges(req, res) {
  const [rows] = await pool.query(
    `SELECT b.id, b.code, b.name, b.icon_url, ub.awarded_at
     FROM user_badges ub JOIN badge_definitions b ON b.id=ub.badge_id
     WHERE ub.user_id=?`, [req.user.id]
  );
  res.json(rows);
}

export async function awardBadge(req, res) {
  const { user_id, badge_id, reason = null } = req.body;
  await pool.query(
    'INSERT IGNORE INTO user_badges (user_id, badge_id, reason) VALUES (?,?,?)',
    [user_id, badge_id, reason]
  );
  // suma puntos si aplica
  const [[b]] = await pool.query('SELECT points_reward FROM badge_definitions WHERE id=?', [badge_id]);
  if (b?.points_reward) {
    await pool.query(
      'INSERT INTO points_ledger (user_id, source_type, source_id, points) VALUES (?,?,?,?)',
      [user_id, 'badge', badge_id, b.points_reward]
    );
  }
  res.json({ ok: true });
}

export async function listChallenges(_req, res) {
  const [rows] = await pool.query('SELECT id, title, description, start_date, end_date, points_reward FROM challenges ORDER BY id DESC');
  res.json(rows);
}

export async function joinChallenge(req, res) {
  const { id } = req.params;
  await pool.query(
    'INSERT IGNORE INTO challenge_participants (challenge_id, user_id) VALUES (?,?)',
    [id, req.user.id]
  );
  res.json({ ok: true });
}

export async function updateChallengeProgress(req, res) {
  const { id } = req.params;
  const { progress_value = 0, status = 'en_curso' } = req.body;
  await pool.query(
    `UPDATE challenge_participants
     SET progress_value=?, status=?, updated_at=NOW()
     WHERE challenge_id=? AND user_id=?`,
    [progress_value, status, id, req.user.id]
  );
  res.json({ ok: true });
}

export async function myPoints(req, res) {
  const [[sum]] = await pool.query('SELECT COALESCE(SUM(points),0) as total FROM points_ledger WHERE user_id=?', [req.user.id]);
  const [rows] = await pool.query('SELECT source_type, source_id, points, created_at FROM points_ledger WHERE user_id=? ORDER BY id DESC LIMIT 100', [req.user.id]);
  res.json({ total: Number(sum.total || 0), ledger: rows });
}

export async function addPoints(req, res) {
  const { user_id, source_type = 'otros', source_id = null, points = 0 } = req.body;
  await pool.query('INSERT INTO points_ledger (user_id, source_type, source_id, points) VALUES (?,?,?,?)',
    [user_id, source_type, source_id, points]);
  res.json({ ok: true });
}
