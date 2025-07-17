// PostgreSQL User model fonksiyonları
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createUser({ firstName, lastName, email, password }) {
  try {
    console.log('[UserModel] createUser SQL:', 'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *', [firstName, lastName, email, password]);
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [firstName, lastName, email, password]
    );
    console.log('[UserModel] createUser result:', JSON.stringify(result.rows[0]));
    return result.rows[0];
  } catch (err) {
    console.error('[UserModel] createUser error:', err);
    throw err;
  }
}

async function findUserByEmail(email) {
  try {
    console.log('[UserModel] findUserByEmail SQL:', 'SELECT * FROM users WHERE email = $1', [email]);
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('[UserModel] findUserByEmail result:', JSON.stringify(result.rows[0]));
    return result.rows[0];
  } catch (err) {
    console.error('[UserModel] findUserByEmail error:', err);
    throw err;
  }
}

async function findUserById(id) {
  try {
    console.log('[UserModel] findUserById SQL:', 'SELECT * FROM users WHERE id = $1', [id]);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    console.log('[UserModel] findUserById result:', JSON.stringify(result.rows[0]));
    return result.rows[0];
  } catch (err) {
    console.error('[UserModel] findUserById error:', err);
    throw err;
  }
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById
};