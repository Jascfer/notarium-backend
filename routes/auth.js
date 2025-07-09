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
  console.log('Login attempt - Raw request body:', req.body);
  
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
  
  console.log('Login attempt - Extracted email:', email);
  console.log('Login attempt - Extracted password:', password);
  console.log('Login attempt - Headers:', req.headers);
  console.log('Login attempt - Content-Type:', req.headers['content-type']);
  
  if (!email || !password) {
    console.log('Missing credentials in request body');
    return res.status(400).json({ message: 'Email ve şifre gereklidir.' });
  }
  
  console.log('Session before login:', req.session);
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.log('Passport error:', err);
      return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    }
    if (!user) {
      console.log('Login failed:', info?.message);
      return res.status(401).json({ message: info?.message || 'Giriş başarısız.' });
    }
    
    console.log('User authenticated:', user.id);
    req.login(user, err => {
      if (err) {
        console.log('Login session error:', err);
        return res.status(500).json({ message: 'Login hatası.' });
      }
      
      console.log('Session after login:', req.session);
      console.log('User in session:', req.user);
      
      // Session'ı kaydet
      req.session.save((err) => {
        if (err) {
          console.log('Session save error:', err);
          return res.status(500).json({ message: 'Session kaydetme hatası.' });
        }
        
        console.log('Session saved successfully');
        console.log('Response headers:', res.getHeaders());
        
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