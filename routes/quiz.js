const express = require('express');
const router = express.Router();
const { createQuiz, getQuizzes } = require('../models/Quiz');

// Tüm quizleri getir
router.get('/', async (req, res) => {
  try {
    const quizzes = await getQuizzes();
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: 'Quizler alınamadı', error: err.message });
  }
});

// Quiz oluştur
router.post('/', async (req, res) => {
  try {
    const quiz = await createQuiz(req.body);
    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Quiz oluşturulamadı', error: err.message });
  }
});

module.exports = router;