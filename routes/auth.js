const express = require('express');
const router = express.Router();
const passport = require('passport');
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
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Giriş sırasında hata oluştu." });
      }
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
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
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
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: "Tüm alanlar gereklidir.", 
        received: { firstName, lastName, email, password: password ? '***' : undefined }
      });
    }
    const nameTaken = await User.findOne({ firstName, lastName });
    if (nameTaken) {
      return res.status(400).json({ message: "Bu isim ve soyisim zaten alınmış." });
    }
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      return res.status(400).json({ message: "Bu e-posta zaten kayıtlı." });
    }
    const user = await User.create({ firstName, lastName, email, password });
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Kayıt sonrası login sırasında hata oluştu." });
      }
      req.session.save(() => {
        res.status(201).json({ message: "Kayıt başarılı", user });
      });
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Kayıt sırasında hata oluştu.", 
      error: err.message
    });
  }
});

module.exports = router;