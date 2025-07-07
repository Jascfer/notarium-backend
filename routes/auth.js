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

// Klasik kayıt (isim-soyisim benzersizliği kontrolü)
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const nameTaken = await User.findOne({ firstName, lastName });
    if (nameTaken) {
      return res.status(400).json({ message: "Bu isim ve soyisim zaten alınmış." });
    }
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      return res.status(400).json({ message: "Bu e-posta zaten kayıtlı." });
    }
    const user = await User.create({ firstName, lastName, email, password });
    res.status(201).json({ message: "Kayıt başarılı", user });
  } catch (err) {
    res.status(500).json({ message: "Kayıt sırasında hata oluştu.", error: err.message });
  }
});

module.exports = router;