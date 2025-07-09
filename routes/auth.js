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
      
      console.log('Login: User logged in successfully:', user.id, user.email);
      console.log('Login: Session before save:', req.session);
      console.log('Login: Is authenticated before save:', req.isAuthenticated());
      
      // Session'ı kaydet
      req.session.save((err) => {
        if (err) {
          console.log('Login: Session save error:', err);
          return res.status(500).json({ message: 'Session kaydetme hatası.' });
        }
        
        console.log('Login: Session saved successfully');
        console.log('Login: Session after save:', req.session);
        console.log('Login: Is authenticated after save:', req.isAuthenticated());
        
        res.json({ message: 'Giriş başarılı', user });
      });
    });
  })(req, res, next);
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
  console.log('Auth/me - Session:', req.session);
  console.log('Auth/me - Cookies:', req.headers.cookie);
  console.log('Auth/me - All headers:', Object.keys(req.headers));
  console.log('Auth/me - Is authenticated:', req.isAuthenticated());
  console.log('Auth/me - User:', req.user);
  
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'Oturum bulunamadı.' });
  }
});

module.exports = router;