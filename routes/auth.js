const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { createUser, findUserByEmail, findUserById } = require('../models/User');

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
  // Request body'den email ve password'ü al
  let email, password;
  
  // Eğer email field'ı object ise, içinden gerçek email'i al
  if (req.body.email && typeof req.body.email === 'object' && req.body.email.email) {
    email = req.body.email.email;
    password = req.body.password || req.body.email.password;
  } else {
    email = req.body.email;
    password = req.body.password;
  }
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email ve şifre gereklidir.' });
  }
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Giriş başarısız.' });
    }
    
    req.login(user, err => {
      if (err) {
        return res.status(500).json({ message: 'Login hatası.' });
      }
      
      // Session'ı kaydet
      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: 'Session kaydetme hatası.' });
        }
        
        res.json({ message: 'Giriş başarılı', user });
      });
    });
  })(req, res, next);
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'Oturum bulunamadı.' });
  }
});

module.exports = router;