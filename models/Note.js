// PostgreSQL Note model fonksiyonları
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createNote({ title, subject, author, description, tags, driveLink }) {
  const result = await pool.query(
    'INSERT INTO notes (title, subject, author, description, tags, drive_link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [title, subject, author, description, tags, driveLink]
  );
  return result.rows[0];
}

async function getNotes() {
  const result = await pool.query('SELECT * FROM notes ORDER BY id DESC');
  return result.rows;
}

async function getNoteById(id) {
  const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
  return result.rows[0];
}

async function deleteNote(id) {
  await pool.query('DELETE FROM notes WHERE id = $1', [id]);
}

module.exports = {
  createNote,
  getNotes,
  getNoteById,
  deleteNote
};