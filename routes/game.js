const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Oyun skoru ekle
router.post('/score', async (req, res) => {
  try {
    const { user_id, score } = req.body;
    const result = await pool.query(
      'INSERT INTO game_scores (user_id, score) VALUES ($1, $2) RETURNING *',
      [user_id, score]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Skor eklenemedi', error: err.message });
  }
});

// Kullanıcının skorlarını getir
router.get('/scores/:user_id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM game_scores WHERE user_id = $1 ORDER BY id DESC',
      [req.params.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Skorlar alınamadı', error: err.message });
  }
});

module.exports = router;