const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createUser, findUserByEmail, findUserById } = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
const JWT_EXPIRES_IN = '7d';

// JWT oluşturucu
function generateToken(user) {
  return jwt.sign({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// JWT doğrulama middleware'i
function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token gerekli' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
  }
}

// Kayıt (Session + Passport)
router.post('/register', async (req, res, next) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }
    const normalizedEmail = email.toLowerCase();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await createUser({ firstName, lastName, email: normalizedEmail, password: hashed });
    req.login(user, (err) => {
      if (err) return next(err);
      // Session/cookie ile döndür
      return res.status(201).json({ message: 'Kayıt başarılı', user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      }});
    });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
});

// Giriş (Session + Passport)
router.post('/login', async (req, res, next) => {
  try {
    console.log('req.body:', req.body);
    const { email, password } = req.body;
    console.log('Gelen login isteği:', email);
    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gereklidir.' });
    }
    const normalizedEmail = email.toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
    console.log('DB\'den dönen user:', user);
    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Şifre yanlış.' });
    }
    req.login(user, (err) => {
      if (err) return next(err);
      // Session/cookie ile döndür
      return res.json({ message: 'Giriş başarılı', user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at
      }});
    });
  } catch (err) {
    res.status(500).json({ message: 'Giriş sırasında hata oluştu.', error: err.message });
  }
});

// Mevcut kullanıcı bilgisini getir (Session/cookie tabanlı)
router.get('/me', async (req, res) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Giriş gerekli' });
  }
  const user = req.user;
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
  res.json({ user: {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    createdAt: user.created_at,
    stats,
    badges,
    dailyLogins,
    experience: 300,
    nextLevelExp: 1000
  }});
});

module.exports = router;
