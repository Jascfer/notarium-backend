const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { createUser, findUserByEmail, findUserById } = require('../models/User');
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Kayıt
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser({ firstName, lastName, email, password: hashed });
    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login hatası.' });
      res.status(201).json({ message: 'Kayıt başarılı', user });
    });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
});

// Giriş
router.post('/login', async (req, res, next) => {
  console.log('=== LOGIN ENDPOINT DEBUG ===');
  console.log('req.headers.cookie:', req.headers.cookie);
  console.log('Session before login:', req.session);
  console.log('=== LOGIN DEBUG ===');
  console.log('Login attempt for:', req.body.email);
  
  passport.authenticate('local', (err, user, info) => {
    console.log('Passport authenticate result:');
    console.log('Error:', err);
    console.log('User:', user);
    console.log('Info:', info);
    
    if (err) return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    if (!user) return res.status(401).json({ message: info?.message || 'Giriş başarısız.' });
    
    console.log('User found, attempting login...');
    
    req.login(user, err => {
      console.log('req.login result - Error:', err);
      console.log('Session after login:', req.session);
      
      if (err) return res.status(500).json({ message: 'Login hatası.' });
      
      // Session'ı kaydet
      req.session.save((err) => {
        console.log('Session save result - Error:', err);
        console.log('Final session:', req.session);
        console.log('Session passport after save:', req.session.passport);
        
        if (err) return res.status(500).json({ message: 'Session kaydetme hatası.' });
        
        console.log('✅ Login successful');
        
        // Seviye hesaplaması (experience bazlı)
        const experience = user.experience || 0;
        const level = Math.floor(experience / 100) + 1;
        const nextLevelExp = level * 100;
        const currentLevelExp = experience % 100;
        const levelProgress = (currentLevelExp / 100) * 100;
        
        // Avatar'ı kullanıcının veritabanındaki değerinden al
        let avatar = user.avatar;
        if (!avatar) {
          // Avatar yoksa varsayılan avatar ata
          const avatarOptions = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🧑‍🔬', '👨‍🏫', '👩‍🏫', '🧑‍🏫'];
          avatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
        }
        
        // Profil için örnek istatistikler ve rozetler
        const stats = {
          notesShared: 5,
          notesDownloaded: 12,
          totalViews: 100,
          totalLikes: 20,
          quizWins: 2
        };
        const badges = [
          { id: 'login3', name: 'Giriş Ustası', icon: '🔥', description: '3 gün üst üste giriş yaptı', earned: new Date() }
        ];
        const dailyLogins = [new Date(), new Date(Date.now() - 86400000), new Date(Date.now() - 2*86400000)];
        
        res.json({ 
          message: 'Giriş başarılı', 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            createdAt: user.created_at,
            avatar,
            level,
            experience,
            nextLevelExp,
            currentLevelExp,
            levelProgress,
            stats,
            badges,
            dailyLogins
          },
          sessionId: req.sessionID
        });
      });
    });
  })(req, res, next);
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', async (req, res) => {
  console.log('=== AUTH/ME ENDPOINT DEBUG ===');
  console.log('req.headers.cookie:', req.headers.cookie);
  console.log('Session at /me:', req.session);
  console.log('=== AUTH/ME DEBUG ===');
  console.log('Session ID:', req.sessionID);
  console.log('Session exists:', !!req.session);
  console.log('Session passport:', req.session?.passport);
  console.log('User:', req.user);
  console.log('Is Authenticated:', req.isAuthenticated());
  console.log('====================');
  
  if (req.isAuthenticated() && req.user) {
    try {
      // Dinamik istatistikler
      const userId = req.user.id;
      // Not sayısı
      const notesRes = await pool.query('SELECT COUNT(*) FROM notes WHERE author = $1', [userId]);
      const notesShared = parseInt(notesRes.rows[0].count, 10);
      // Sohbet mesajı sayısı
      const chatRes = await pool.query('SELECT COUNT(*) FROM chat_messages WHERE user_id = $1', [userId]);
      const chatMessages = parseInt(chatRes.rows[0].count, 10);
      // Quiz/oyun sayısı (örnek, tablo varsa)
      let quizWins = 0;
      try {
        const quizRes = await pool.query('SELECT COUNT(*) FROM game_scores WHERE user_id = $1', [userId]);
        quizWins = parseInt(quizRes.rows[0].count, 10);
      } catch (e) { quizWins = 0; }
      // Diğer istatistikler için benzer sorgular eklenebilir
      const stats = {
        notesShared,
        chatMessages,
        quizWins
      };
      // Rozetler ve diğer alanlar sabit kalabilir
      const badges = [
        { id: 'login3', name: 'Giriş Ustası', icon: '🔥', description: '3 gün üst üste giriş yaptı', earned: new Date() }
      ];
      const dailyLogins = [new Date(), new Date(Date.now() - 86400000), new Date(Date.now() - 2*86400000)];
      // Avatar'ı kullanıcının veritabanındaki değerinden al
      let avatar = req.user.avatar;
      if (!avatar) {
        // Avatar yoksa varsayılan avatar ata
        const avatarOptions = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '👨‍💻', '👩‍💻', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🧑‍🔬', '👨‍🏫', '👩‍🏫', '🧑‍🏫'];
        avatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
      }
      // Seviye hesaplaması (experience bazlı)
      const experience = req.user.experience || 0;
      const level = Math.floor(experience / 100) + 1;
      const nextLevelExp = level * 100;
      const currentLevelExp = experience % 100;
      const levelProgress = (currentLevelExp / 100) * 100;
      
      const userResponse = {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        role: req.user.role,
        createdAt: req.user.created_at,
        avatar,
        level,
        experience,
        nextLevelExp,
        currentLevelExp,
        levelProgress,
        stats,
        badges,
        dailyLogins
      };
      res.json({ 
        user: userResponse,
        sessionId: req.sessionID,
        authenticated: true 
      });
    } catch (err) {
      console.error('Profil istatistikleri alınırken hata:', err);
      res.status(500).json({ message: 'Profil istatistikleri alınamadı', error: err.message });
    }
  } else {
    console.log('❌ User not authenticated');
    res.status(401).json({ 
      message: 'Oturum bulunamadı.',
      authenticated: false,
      sessionId: req.sessionID,
      sessionExists: !!req.session,
      passportExists: !!req.session?.passport
    });
  }
});

// Çıkış
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Çıkış sırasında hata oluştu.' });
    }
    res.json({ message: 'Çıkış başarılı' });
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route çalışıyor',
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
});

module.exports = router;