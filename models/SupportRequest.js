const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:password@localhost:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createSupportRequest({ userId, userName, subject, message }) {
  const result = await pool.query(
    `INSERT INTO support_requests (user_id, user_name, subject, message, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'open', NOW(), NOW()) RETURNING *`,
    [userId, userName, subject, message]
  );
  return result.rows[0];
}

async function getUserRequests(userId) {
  const result = await pool.query(
    'SELECT * FROM support_requests WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function getAllRequests() {
  const result = await pool.query(
    'SELECT * FROM support_requests ORDER BY created_at DESC'
  );
  return result.rows;
}

async function respondToRequest({ requestId, responderId, responderName, response }) {
  const result = await pool.query(
    `UPDATE support_requests SET status = 'closed', response = $1, responder_id = $2, responder_name = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
    [response, responderId, responderName, requestId]
  );
  return result.rows[0];
}

module.exports = {
  createSupportRequest,
  getUserRequests,
  getAllRequests,
  respondToRequest
}; 