const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { createUser, findUserByEmail, findUserById } = require('../models/User');

// Kayıt
router.post('/register', async (req, res) => {
  console.log('[REGISTER] Body:', req.body);
  console.log('[REGISTER] Session:', req.session);
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      console.error('[REGISTER] Eksik alan:', { firstName, lastName, email, password });
      return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      console.error('[REGISTER] E-posta zaten kayıtlı:', email);
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser({ firstName, lastName, email, password: hashed });
    req.login(user, err => {
      if (err) {
        console.error('[REGISTER] Login hatası:', err);
        return res.status(500).json({ message: 'Login hatası.' });
      }
      console.log('[REGISTER] Kayıt başarılı, user:', user);
      res.status(201).json({ message: 'Kayıt başarılı', user });
    });
  } catch (err) {
    console.error('[REGISTER] Kayıt sırasında hata:', err.stack || err);
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
});

// Giriş
router.post('/login', async (req, res, next) => {
  console.log('[LOGIN] Body:', req.body);
  console.log('[LOGIN] Session:', req.session);
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('[LOGIN] Giriş sırasında hata:', err.stack || err);
      return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    }
    if (!user) {
      console.error('[LOGIN] Kullanıcı bulunamadı veya şifre yanlış:', info);
      return res.status(401).json({ message: info?.message || 'Giriş başarısız.' });
    }
    req.login(user, err => {
      if (err) {
        console.error('[LOGIN] Login hatası:', err);
        return res.status(500).json({ message: 'Login hatası.' });
      }
      console.log('[LOGIN] Giriş başarılı, user:', user);
      res.json({ message: 'Giriş başarılı', user });
    });
  })(req, res, next);
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
  console.log('[ME] Session:', req.session);
  console.log('[ME] User:', req.user);
  console.log('[ME] Cookies:', req.cookies);
  console.log('[ME] Is Authenticated:', req.isAuthenticated?.());
  if (req.isAuthenticated()) {
    console.log('[ME] Authenticated user:', req.user);
    res.json({ 
      user: req.user,
      sessionId: req.sessionID,
      authenticated: true 
    });
  } else {
    console.error('[ME] Oturum bulunamadı veya kullanıcı login değil.');
    res.status(401).json({ 
      message: 'Oturum bulunamadı.',
      authenticated: false,
      sessionId: req.sessionID
    });
  }
});

// Çıkış
router.post('/logout', (req, res) => {
  console.log('[LOGOUT] User:', req.user);
  req.logout((err) => {
    if (err) {
      console.error('[LOGOUT] Çıkış sırasında hata:', err.stack || err);
      return res.status(500).json({ message: 'Çıkış sırasında hata oluştu.' });
    }
    console.log('[LOGOUT] Çıkış başarılı');
    res.json({ message: 'Çıkış başarılı' });
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('[TEST] Session:', req.session);
  console.log('[TEST] User:', req.user);
  console.log('[TEST] Is Authenticated:', req.isAuthenticated?.());
  res.json({ 
    message: 'Auth route çalışıyor',
    session: req.session,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
});

module.exports = router;
