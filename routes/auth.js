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
    const token = generateToken(user);
    res.status(201).json({ message: 'Kayıt başarılı', user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    }, token });
  } catch (err) {
    res.status(500).json({ message: 'Kayıt sırasında hata oluştu.', error: err.message });
  }
});

// Giriş
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre gereklidir.' });
    }
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Şifre yanlış.' });
    }
    const token = generateToken(user);
    res.json({ message: 'Giriş başarılı', user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role
    }, token });
  } catch (err) {
    res.status(500).json({ message: 'Giriş sırasında hata oluştu.', error: err.message });
  }
});

// Mevcut kullanıcı bilgisini getir (korumalı)
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    // Token'dan gelen user bilgisi
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Kullanıcı bilgisi alınamadı.', error: err.message });
  }
});

module.exports = router;
