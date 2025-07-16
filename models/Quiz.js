// PostgreSQL Quiz model fonksiyonları
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Günlük soru seti oluştur (5 soru)
async function getDailyQuestions() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
  
  // Bugün için soru seti var mı kontrol et
  let result = await pool.query(
    'SELECT * FROM daily_quiz_sets WHERE date = $1',
    [today]
  );
  
  if (result.rows.length === 0) {
    // Bugün için soru seti yoksa yeni oluştur
    const questions = await generateDailyQuestionSet();
    
    // Veritabanına kaydet
    await pool.query(
      'INSERT INTO daily_quiz_sets (date, questions) VALUES ($1, $2)',
      [today, JSON.stringify(questions)]
    );
    
    return questions;
  }
  
  return result.rows[0].questions;
}

// Günlük soru seti oluştur (5 rastgele soru)
async function generateDailyQuestionSet() {
  // Tüm sorulardan rastgele 5 tane seç
  const result = await pool.query(
    'SELECT * FROM quiz_questions ORDER BY RANDOM() LIMIT 5'
  );
  
  return result.rows.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correct_answer,
    explanation: q.explanation,
    category: q.category,
    difficulty: q.difficulty
  }));
}

// Kullanıcının bugün quiz çözüp çözmediğini kontrol et
async function hasUserSolvedToday(userId) {
  const today = new Date().toISOString().split('T')[0];
  const result = await pool.query(
    'SELECT * FROM quiz_scores WHERE user_id = $1 AND date = $2',
    [userId, today]
  );
  return result.rows.length > 0;
}

// Quiz skorunu kaydet
async function saveQuizScore(userId, score, answers) {
  const today = new Date().toISOString().split('T')[0];
  
  await pool.query(
    'INSERT INTO quiz_scores (user_id, score, answers, date) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id, date) DO UPDATE SET score = $2, answers = $3',
    [userId, score, JSON.stringify(answers), today]
  );
  
  // Kullanıcının deneyim puanını artır
  const experienceGain = score * 10; // Her doğru cevap 10 XP
  await pool.query(
    'UPDATE users SET experience = COALESCE(experience, 0) + $1 WHERE id = $2',
    [experienceGain, userId]
  );
}

// Kullanıcının quiz geçmişini getir
async function getUserQuizHistory(userId) {
  const result = await pool.query(
    'SELECT * FROM quiz_scores WHERE user_id = $1 ORDER BY date DESC LIMIT 10',
    [userId]
  );
  return result.rows;
}

// Liderlik tablosunu getir
async function getLeaderboard() {
  const result = await pool.query(`
    SELECT u.first_name, u.last_name, u.avatar, 
           COUNT(qs.id) as total_quizzes,
           AVG(qs.score) as avg_score,
           SUM(qs.score) as total_score
    FROM users u
    LEFT JOIN quiz_scores qs ON u.id = qs.user_id
    WHERE qs.id IS NOT NULL
    GROUP BY u.id, u.first_name, u.last_name, u.avatar
    ORDER BY total_score DESC, avg_score DESC
    LIMIT 10
  `);
  return result.rows;
}

// Varsayılan soruları ekle (eğer yoksa)
async function seedDefaultQuestions() {
  const defaultQuestions = [
    {
      question: "Türkiye'nin başkenti neresidir?",
      options: ["İstanbul", "Ankara", "İzmir", "Bursa"],
      correct_answer: 1,
      explanation: "Türkiye'nin başkenti 13 Ekim 1923'ten beri Ankara'dır.",
      category: "Genel Kültür",
      difficulty: "Kolay"
    },
    {
      question: "Hangi gezegen Güneş'e en yakındır?",
      options: ["Mars", "Venüs", "Merkür", "Dünya"],
      correct_answer: 2,
      explanation: "Merkür Güneş Sistemi'ndeki en küçük ve Güneş'e en yakın gezegendir.",
      category: "Bilim",
      difficulty: "Kolay"
    },
    {
      question: "2 + 2 × 3 = ?",
      options: ["12", "8", "10", "6"],
      correct_answer: 1,
      explanation: "İşlem önceliği kuralına göre önce çarpma yapılır: 2 + (2×3) = 2 + 6 = 8",
      category: "Matematik",
      difficulty: "Orta"
    },
    {
      question: "Hangi element periyodik tabloda 'Fe' sembolü ile gösterilir?",
      options: ["Flor", "Demir", "Fosfor", "Fermiyum"],
      correct_answer: 1,
      explanation: "Fe sembolü Demir elementini temsil eder (Iron - Fe).",
      category: "Kimya",
      difficulty: "Orta"
    },
    {
      question: "Hangi yıl Türkiye Cumhuriyeti kurulmuştur?",
      options: ["1920", "1921", "1922", "1923"],
      correct_answer: 3,
      explanation: "Türkiye Cumhuriyeti 29 Ekim 1923'te ilan edilmiştir.",
      category: "Tarih",
      difficulty: "Kolay"
    },
    {
      question: "DNA'nın açılımı nedir?",
      options: ["Deoksiribo Nükleik Asit", "Deoksi Nitrik Asit", "Deoksiribo Nitrik Asit", "Deoksi Nükleik Asit"],
      correct_answer: 0,
      explanation: "DNA, Deoksiribo Nükleik Asit'in kısaltmasıdır.",
      category: "Biyoloji",
      difficulty: "Orta"
    },
    {
      question: "Hangi programlama dili web geliştirme için en yaygın kullanılır?",
      options: ["Python", "JavaScript", "Java", "C++"],
      correct_answer: 1,
      explanation: "JavaScript web geliştirmede en yaygın kullanılan programlama dilidir.",
      category: "Bilgisayar",
      difficulty: "Orta"
    },
    {
      question: "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?",
      options: ["Venüs", "Mars", "Jüpiter", "Satürn"],
      correct_answer: 1,
      explanation: "Mars, yüzeyindeki demir oksit nedeniyle kırmızı görünür ve 'Kızıl Gezegen' olarak bilinir.",
      category: "Bilim",
      difficulty: "Kolay"
    },
    {
      question: "Hangi yıl İstanbul fethedilmiştir?",
      options: ["1451", "1453", "1455", "1457"],
      correct_answer: 1,
      explanation: "İstanbul 29 Mayıs 1453'te Fatih Sultan Mehmet tarafından fethedilmiştir.",
      category: "Tarih",
      difficulty: "Orta"
    },
    {
      question: "Hangi matematikçi 'Sıfır' kavramını matematik dünyasına kazandırmıştır?",
      options: ["Pisagor", "Arşimet", "Öklid", "El-Harezmi"],
      correct_answer: 3,
      explanation: "El-Harezmi, sıfır kavramını matematik dünyasına kazandıran önemli matematikçilerdendir.",
      category: "Matematik",
      difficulty: "Zor"
    }
  ];

  for (const question of defaultQuestions) {
    await pool.query(
      'INSERT INTO quiz_questions (question, options, correct_answer, explanation, category, difficulty) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
      [question.question, question.options, question.correct_answer, question.explanation, question.category, question.difficulty]
    );
  }
}

module.exports = {
  getDailyQuestions,
  hasUserSolvedToday,
  saveQuizScore,
  getUserQuizHistory,
  getLeaderboard,
  seedDefaultQuestions
};