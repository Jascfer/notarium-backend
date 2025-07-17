// PostgreSQL User model fonksiyonları
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createUser({ firstName, lastName, email, password }) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2');
      const maskedPassword = password ? '***' : '';
      console.log('[UserModel] createUser SQL:', 'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *', [firstName, lastName, maskedEmail, maskedPassword]);
    }
    const result = await pool.query(
      'INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [firstName, lastName, email, password]
    );
    if (process.env.NODE_ENV !== 'production') {
      const maskedResult = { ...result.rows[0], email: result.rows[0].email.replace(/(.{2}).+(@.+)/, '$1***$2'), password: '***' };
      console.log('[UserModel] createUser result:', JSON.stringify(maskedResult));
    }
    return result.rows[0];
  } catch (err) {
    console.error('[UserModel] createUser error:', err);
    throw err;
  }
}

async function findUserByEmail(email) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2');
      console.log('[UserModel] findUserByEmail SQL:', 'SELECT * FROM users WHERE email = $1', [maskedEmail]);
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (process.env.NODE_ENV !== 'production') {
      const maskedResult = result.rows[0] ? { ...result.rows[0], email: result.rows[0].email.replace(/(.{2}).+(@.+)/, '$1***$2'), password: '***' } : undefined;
      console.log('[UserModel] findUserByEmail result:', JSON.stringify(maskedResult));
    }
    return result.rows[0];
  } catch (err) {
    console.error('[UserModel] findUserByEmail error:', err);
    throw err;
  }
}

async function findUserById(id) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[UserModel] findUserById SQL:', 'SELECT * FROM users WHERE id = $1', [id]);
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (process.env.NODE_ENV !== 'production') {
      const maskedResult = result.rows[0] ? { ...result.rows[0], email: result.rows[0].email.replace(/(.{2}).+(@.+)/, '$1***$2'), password: '***' } : undefined;
      console.log('[UserModel] findUserById result:', JSON.stringify(maskedResult));
    }
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