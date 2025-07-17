// jwt middleware

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Giriş yapmanız gerekiyor.' });
}

module.exports = { ensureAuthenticated };