// PostgreSQL ChatMessage model fonksiyonları
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createChatMessage({ channel, user, message }) {
  const result = await pool.query(
    'INSERT INTO chat_messages (channel, user_id, message) VALUES ($1, $2, $3) RETURNING *',
    [channel, user, message]
  );
  return result.rows[0];
}

async function getMessagesByChannel(channel) {
  const result = await pool.query(
    'SELECT * FROM chat_messages WHERE channel = $1 ORDER BY created_at ASC',
    [channel]
  );
  return result.rows;
}

module.exports = {
  createChatMessage,
  getMessagesByChannel
}; 