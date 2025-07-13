// Authentication middleware
const isAuthenticated = (req, res, next) => {
  console.log('Auth Middleware - Session:', req.session);
  console.log('Auth Middleware - User:', req.user);
  console.log('Auth Middleware - Is authenticated:', req.isAuthenticated());
  
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Session ID parametresi varsa kontrol et
  const sessionId = req.query.sessionId;
  if (sessionId) {
    console.log('Auth Middleware - Checking session ID:', sessionId);
    req.sessionStore.get(sessionId, (err, session) => {
      if (err) {
        console.log('Auth Middleware - Error loading session:', err);
        return res.status(401).json({ message: 'Oturum bulunamadı.' });
      }
      if (session && session.passport && session.passport.user) {
        console.log('Auth Middleware - Session loaded, user ID:', session.passport.user);
        const { findUserById } = require('../models/User');
        findUserById(session.passport.user).then(user => {
          if (user) {
            req.user = user;
            return next();
          } else {
            return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
          }
        }).catch(err => {
          console.log('Auth Middleware - Error finding user:', err);
          return res.status(401).json({ message: 'Kullanıcı bulunamadı.' });
        });
      } else {
        console.log('Auth Middleware - No valid session data');
        return res.status(401).json({ message: 'Oturum bulunamadı.' });
      }
    });
    return;
  }
  
  res.status(401).json({ message: 'Oturum bulunamadı.' });
};

module.exports = { isAuthenticated };