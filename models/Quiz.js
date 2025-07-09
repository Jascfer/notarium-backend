// PostgreSQL Quiz model fonksiyonları
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createQuiz({ title, questions, creator }) {
  const result = await pool.query(
    'INSERT INTO quizzes (title, questions, creator) VALUES ($1, $2, $3) RETURNING *',
    [title, JSON.stringify(questions), creator]
  );
  return result.rows[0];
}

async function getQuizzes() {
  const result = await pool.query('SELECT * FROM quizzes ORDER BY id DESC');
  // Her quiz'in questions alanını array'e çevir
  return result.rows.map(q => ({
    ...q,
    questions: typeof q.questions === 'string' ? JSON.parse(q.questions) : q.questions
  }));
}

module.exports = {
  createQuiz,
  getQuizzes
};