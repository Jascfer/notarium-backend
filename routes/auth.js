const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { createUser, findUserByEmail, findUserById } = require('../models/User');

// ✅ Kayıt
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

      // ✅ Session'a kullanıcıyı manuel yaz ve kaydet
      req.session.user = {
        id: user._id,
        email: user.email
      };

      req.session.save(() => {
        res.status(201).json({ message: 'Kayıt başarılı', user });
      });
    });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
});

// ✅ Giriş
router.post('/login', async (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
    if (!user) return res.status(401).json({ message: info?.message || 'Giriş başarısız.' });

    req.login(user, err => {
      if (err) return res.status(500).json({ message: 'Login hatası.' });

      // ✅ Session'a kullanıcıyı manuel yaz ve kaydet
      req.session.user = {
        id: user._id,
        email: user.email
      };

      req.session.save(() => {
        res.json({ message: 'Giriş başarılı', user });
      });
    });
  })(req, res, next);
});

// ✅ Mevcut kullanıcı bilgisini getir
router.get('/me', (req, res) => {
  console.log('Auth/me endpoint called');
  console.log('Session:', req.session);
  console.log('Session User:', req.session?.user);

  if (req.session?.user) {
    res.json({
      user: req.session.user,
      sessionId: req.sessionID,
      authenticated: true
    });
  } else {
    res.status(401).json({
      message: 'Oturum bulunamadı.',
      authenticated: false,
      sessionId: req.sessionID
    });
  }
});

// ✅ Çıkış
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).json({ message: 'Çıkış sırasında hata oluştu.' });
    }

    req.session.destroy(() => {
      res.clearCookie('connect.sid', {
        domain: '.notarium.tr',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none'
      });
      res.json({ message: 'Çıkış başarılı' });
    });
  });
});

// ✅ Test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth route çalışıyor',
    session: req.session,
    user: req.session?.user,
    isAuthenticated: !!req.session?.user
  });
});

module.exports = router;
