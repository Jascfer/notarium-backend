const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const User = require('../models/User');

// Google ile giriş başlat
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google callback
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: true }),
  (req, res) => {
    // Başarılı girişten sonra frontend'e yönlendir
    res.redirect(process.env.CLIENT_URL || '/');
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
      res.json({ message: "Giriş başarılı", user });
    });
  } catch (err) {
    res.status(500).json({ message: "Giriş sırasında hata oluştu.", error: err.message });
  }
});

// Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
  console.log('Auth check - isAuthenticated:', req.isAuthenticated());
  console.log('Auth check - user:', req.user);
  
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
    console.log('Register request body:', req.body);
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
    
    console.log('Creating user with:', { firstName, lastName, email });
    const user = await User.create({ firstName, lastName, email, password });
    console.log('User created successfully:', user._id);
    
    res.status(201).json({ message: "Kayıt başarılı", user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ 
      message: "Kayıt sırasında hata oluştu.", 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

module.exports = router;