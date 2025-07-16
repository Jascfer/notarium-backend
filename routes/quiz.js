const express = require('express');
const router = express.Router();
const { 
  getDailyQuestions, 
  hasUserSolvedToday, 
  saveQuizScore, 
  getUserQuizHistory, 
  getLeaderboard,
  seedDefaultQuestions 
} = require('../models/Quiz');

// Günlük quiz sorularını getir
router.get('/', async (req, res) => {
  try {
    // Kullanıcı giriş yapmış mı kontrol et
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Giriş gerekli' });
    }

    // Varsayılan soruları ekle (eğer yoksa)
    await seedDefaultQuestions();

    // Kullanıcının bugün quiz çözüp çözmediğini kontrol et
    const alreadySolved = await hasUserSolvedToday(req.user.id);

    if (alreadySolved) {
      return res.json({ 
        alreadySolved: true, 
        message: 'Bugünün quizini zaten çözdünüz. Yarın yeni sorularla tekrar deneyin!' 
      });
    }

    // Günlük soruları getir
    const questions = await getDailyQuestions();

    res.json({
      alreadySolved: false,
      questions: questions,
      totalQuestions: questions.length,
      timeLimit: 30 // Her soru için 30 saniye
    });

  } catch (error) {
    console.error('Quiz getirme hatası:', error);
    res.status(500).json({ message: 'Quiz yüklenirken hata oluştu' });
  }
});

// Quiz skorunu kaydet
router.post('/submit', async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Giriş gerekli' });
    }

    const { score, answers } = req.body;

    if (typeof score !== 'number' || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Geçersiz skor veya cevaplar' });
    }

    // Skoru kaydet
    await saveQuizScore(req.user.id, score, answers);

    // Kazanılan XP hesapla
    const experienceGain = score * 10;

    res.json({
      success: true,
      score: score,
      experienceGain: experienceGain,
      message: `Tebrikler! ${score} doğru cevap ve ${experienceGain} XP kazandınız!`
    });

  } catch (error) {
    console.error('Quiz skor kaydetme hatası:', error);
    res.status(500).json({ message: 'Skor kaydedilirken hata oluştu' });
  }
});

// Kullanıcının quiz geçmişini getir
router.get('/history', async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Giriş gerekli' });
    }

    const history = await getUserQuizHistory(req.user.id);

    res.json({
      history: history,
      totalQuizzes: history.length,
      averageScore: history.length > 0 
        ? Math.round(history.reduce((sum, quiz) => sum + quiz.score, 0) / history.length * 10) / 10
        : 0
    });

  } catch (error) {
    console.error('Quiz geçmişi getirme hatası:', error);
    res.status(500).json({ message: 'Geçmiş yüklenirken hata oluştu' });
  }
});

// Liderlik tablosunu getir
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();

    res.json({
      leaderboard: leaderboard,
      totalParticipants: leaderboard.length
    });

  } catch (error) {
    console.error('Liderlik tablosu getirme hatası:', error);
    res.status(500).json({ message: 'Liderlik tablosu yüklenirken hata oluştu' });
  }
});

// Kullanıcının bugün quiz çözüp çözmediğini kontrol et
router.get('/status', async (req, res) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Giriş gerekli' });
    }

    const alreadySolved = await hasUserSolvedToday(req.user.id);

    res.json({
      alreadySolved: alreadySolved,
      canTakeQuiz: !alreadySolved
    });

  } catch (error) {
    console.error('Quiz durumu kontrol hatası:', error);
    res.status(500).json({ message: 'Durum kontrol edilirken hata oluştu' });
  }
});

module.exports = router;