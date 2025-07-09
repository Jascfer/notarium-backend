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
      console.log('Login: Session ID before save:', req.sessionID);
      
      // Session'ı kaydet
      req.session.save((err) => {
        if (err) {
          console.log('Login: Session save error:', err);
          return res.status(500).json({ message: 'Session kaydetme hatası.' });
        }
        
        console.log('Login: Session saved successfully');
        console.log('Login: Session after save:', req.session);
        console.log('Login: Is authenticated after save:', req.isAuthenticated());
        console.log('Login: Session ID after save:', req.sessionID);
        
        // Session store'da session'ın kaydedilip kaydedilmediğini kontrol et
        req.sessionStore.get(req.sessionID, (err, session) => {
          if (err) {
            console.log('Login: Error checking session in store:', err);
          } else {
            console.log('Login: Session in store after save:', session);
          }
        });
        
        res.json({ message: 'Giriş başarılı', user, sessionId: req.sessionID });
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
  console.log('Auth/me - Session ID:', req.sessionID);
  console.log('Auth/me - URL params:', req.query);
  
  // URL parametresinden session ID'yi kontrol et
  const sessionIdFromUrl = req.query.sessionId;
  if (sessionIdFromUrl) {
    console.log('Auth/me - Session ID from URL:', sessionIdFromUrl);
    // Session'ı manuel olarak yükle
    req.sessionStore.get(sessionIdFromUrl, (err, session) => {
      if (err) {
        console.log('Auth/me - Error loading session from URL:', err);
        return res.status(401).json({ message: 'Oturum bulunamadı.' });
      }
      if (session && session.passport && session.passport.user) {
        console.log('Auth/me - Session loaded from URL, user ID:', session.passport.user);
        // User'ı yükle
        const { findUserById } = require('../models/User');
        findUserById(session.passport.user).then(user => {
          if (user) {
            req.user = user;
            return res.json({ user });
          } else {
            return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
          }
        }).catch(err => {
          console.log('Auth/me - Error finding user from URL session:', err);
          return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
        });
      } else {
        console.log('Auth/me - No valid session data found in URL session');
        return res.status(401).json({ message: 'Oturum bulunamadı.' });
      }
    });
    return;
  }
  
  // Eğer cookie yoksa ama session ID varsa, session'ı manuel olarak yükle
  if (!req.headers.cookie && req.sessionID) {
    console.log('Auth/me - No cookie header, but session ID exists. Attempting to load session manually.');
    // Session'ı manuel olarak yüklemeyi dene
    req.sessionStore.get(req.sessionID, (err, session) => {
      if (err) {
        console.log('Auth/me - Error loading session:', err);
        return res.status(401).json({ message: 'Oturum bulunamadı.' });
      }
      if (session && session.passport && session.passport.user) {
        console.log('Auth/me - Session loaded manually, user ID:', session.passport.user);
        // User'ı yükle
        const { findUserById } = require('../models/User');
        findUserById(session.passport.user).then(user => {
          if (user) {
            req.user = user;
            return res.json({ user });
          } else {
            return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
          }
        }).catch(err => {
          console.log('Auth/me - Error finding user:', err);
          return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
        });
      } else {
        console.log('Auth/me - No valid session data found');
        return res.status(401).json({ message: 'Oturum bulunamadı.' });
      }
    });
    return;
  }
  
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: 'Oturum bulunamadı.' });
  }
});

module.exports = router;