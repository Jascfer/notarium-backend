const express = require('express');
const router = express.Router();
const passport = require('passport'); // Use the global passport instance
const User = require('../models/User');
const mongoose = require('mongoose');

const FRONTEND_URL = 'https://notarium.tr';

// Test endpoint - MongoDB bağlantısını kontrol et
router.get('/test', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    message: 'Auth test endpoint',
    mongodb: {
      state: states[dbState],
      readyState: dbState
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? '***' : 'undefined'
    }
  });
});

// GET /login - Sadece tarayıcıdan doğrudan erişimde yönlendir
router.get('/login', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(404).json({ error: 'GET /auth/login sadece frontend için yönlendirilir.' });
  }
  res.redirect(`${FRONTEND_URL}/auth/login`);
});

// GET /register - Sadece tarayıcıdan doğrudan erişimde yönlendir
router.get('/register', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(404).json({ error: 'GET /auth/register sadece frontend için yönlendirilir.' });
  }
  res.redirect(`${FRONTEND_URL}/auth/register`);
});

// GET /logout - Sadece tarayıcıdan doğrudan erişimde yönlendir
router.get('/logout', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(404).json({ error: 'GET /auth/logout sadece frontend için yönlendirilir.' });
  }
  res.redirect(FRONTEND_URL);
});

// GET /me - Sadece tarayıcıdan doğrudan erişimde yönlendir
router.get('/me', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(404).json({ error: 'GET /auth/me sadece frontend için yönlendirilir.' });
  }
  res.redirect(`${FRONTEND_URL}/profile`);
});

// GET /google - Sadece tarayıcıdan doğrudan erişimde yönlendir
router.get('/google', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(404).json({ error: 'GET /auth/google sadece frontend için yönlendirilir.' });
  }
  res.redirect(`${FRONTEND_URL}/auth/login`);
});

// Google ile giriş başlat
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  (req, res) => {
    // Başarılı girişten sonra frontend'e yönlendir
    console.log('Google login sonrası req.user:', req.user);
    console.log('Google login sonrası session:', req.session);
    req.session.save(() => {
      res.redirect(process.env.CLIENT_URL || '/');
    });
  }
);

// Klasik giriş
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ message: "E-posta veya şifre hatalı." });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "E-posta veya şifre hatalı." });
    }
    
    // Session'a kullanıcı bilgisini kaydet
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Giriş sırasında hata oluştu." });
      }
      // --- EKLENDİ: Debug logları ve session kaydı ---
      console.log('Klasik login sonrası req.user:', req.user);
      console.log('Klasik login sonrası session:', req.session);
      req.session.save(() => {
        res.json({ message: "Giriş başarılı", user });
      });
    });
  } catch (err) {
    res.status(500).json({ message: "Giriş sırasında hata oluştu.", error: err.message });
  }
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
  console.log('=== /auth/me endpoint called ===');
  console.log('Request headers:', req.headers);
  console.log('Session ID:', req.sessionID);
  console.log('Session data:', req.session);
  console.log('isAuthenticated:', req.isAuthenticated());
  console.log('User:', req.user);
  console.log('Cookies:', req.headers.cookie);
  
  if (req.isAuthenticated()) {
    console.log('✅ User is authenticated, returning user data');
    res.json({ user: req.user });
  } else {
    console.log('❌ User is not authenticated, returning 401');
    res.status(401).json({ message: "Oturum bulunamadı." });
  }
});

// Çıkış
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Çıkış sırasında hata oluştu." });
    }
    res.json({ message: "Çıkış başarılı" });
  });
});

// Klasik kayıt (isim-soyisim benzersizliği kontrolü)
router.post('/register', async (req, res) => {
  console.log('=== REGISTER ENDPOINT CALLED ===');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  
  try {
    const { firstName, lastName, email, password } = req.body;
    
    console.log('Extracted data:', { firstName, lastName, email, password: password ? '***' : undefined });
    
    if (!firstName || !lastName || !email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: "Tüm alanlar gereklidir.", 
        received: { firstName, lastName, email, password: password ? '***' : undefined }
      });
    }
    
    console.log('Checking for existing users...');
    const nameTaken = await User.findOne({ firstName, lastName });
    console.log('Name taken result:', nameTaken ? 'YES' : 'NO');
    
    if (nameTaken) {
      return res.status(400).json({ message: "Bu isim ve soyisim zaten alınmış." });
    }
    
    const emailTaken = await User.findOne({ email });
    console.log('Email taken result:', emailTaken ? 'YES' : 'NO');
    
    if (emailTaken) {
      return res.status(400).json({ message: "Bu e-posta zaten kayıtlı." });
    }
    
    console.log('Creating new user...');
    const user = await User.create({ firstName, lastName, email, password });
    console.log('User created successfully:', user._id);
    
    // --- EKLENDİ: Kayıt sonrası otomatik login ---
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Kayıt sonrası login sırasında hata oluştu." });
      }
      console.log('Kayıt sonrası req.user:', req.user);
      console.log('Kayıt sonrası session:', req.session);
      req.session.save(() => {
        res.status(201).json({ message: "Kayıt başarılı", user });
      });
    });
  } catch (err) {
    console.error('=== REGISTER ERROR ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      message: "Kayıt sırasında hata oluştu.", 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;