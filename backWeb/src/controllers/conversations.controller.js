import { pool, withTx } from '../config/db.js';

export async function createConversation(req, res) {
  const { title = null, is_group = 0, members = [] } = req.body; // members: [userId,...]
  const id = await withTx(async (conn) => {
    const [cIns] = await conn.query(
      'INSERT INTO conversations (is_group, title, created_by) VALUES (?,?,?)',
      [is_group ? 1 : 0, title, req.user.id]
    );
    const conversationId = cIns.insertId;
    // owner + miembros
    await conn.query('INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (?,?,?)',
      [conversationId, req.user.id, 'owner']);
    for (const uid of members) {
      if (uid !== req.user.id) {
        await conn.query('INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?,?,?)',
          [conversationId, uid, 'member']);
      }
    }
    return conversationId;
  });
  res.status(201).json({ id });
}

export async function addMember(req, res) {
  const { conversationId } = req.params;
  const { user_id } = req.body;
  await pool.query(
    'INSERT IGNORE INTO conversation_members (conversation_id, user_id, role) VALUES (?,?,?)',
    [conversationId, user_id, 'member']
  );
  res.json({ ok: true });
}

export async function myConversations(req, res) {
  const [rows] = await pool.query(
    `SELECT c.id, c.is_group, c.title, c.created_at
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id=c.id
     WHERE m.user_id=?
     ORDER BY c.created_at DESC`, [req.user.id]
  );
  res.json(rows);
}

export async function listMessages(req, res) {
  const { conversationId } = req.params;
  const [rows] = await pool.query(
    `SELECT id, user_id, body, attachment_url, created_at
     FROM messages WHERE conversation_id=? ORDER BY created_at ASC`, [conversationId]
  );
  res.json(rows);
}

export async function sendMessage(req, res) {
  const { conversationId } = req.params;
  const { body = '', attachment_url = null } = req.body;
  const [ins] = await pool.query(
    'INSERT INTO messages (conversation_id, user_id, body, attachment_url) VALUES (?,?,?,?)',
    [conversationId, req.user.id, body, attachment_url]
  );
  res.status(201).json({ id: ins.insertId });
}

export async function markRead(req, res) {
  const { conversationId } = req.params;
  // marca leídos los últimos mensajes
  const [msgs] = await pool.query('SELECT id FROM messages WHERE conversation_id=?', [conversationId]);
  if (msgs.length) {
    const values = msgs.map(m => `(${m.id}, ${req.user.id})`).join(',');
    await pool.query(
      `INSERT IGNORE INTO message_reads (message_id, user_id) VALUES ${values}`
    );
  }
  res.json({ ok: true });
}
