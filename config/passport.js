const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const { findUserByEmail, findUserById, createUser } = require('../models/User');

// Local Strategy (email/password)
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return done(null, false, { message: 'Bu e-posta adresi bulunamadı.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return done(null, false, { message: 'Şifre yanlış.' });
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

// Google Strategy - Only if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const [firstName, ...lastNameArr] = profile.displayName.split(' ');
        const lastName = lastNameArr.join(' ');
        const nameTaken = await findUserByEmail(profile.emails[0].value);
        if (nameTaken && nameTaken.google_id !== profile.id) {
          return done(null, false, { message: "Bu isim ve soyisim zaten alınmış." });
        }
        let user = await findUserById(profile.id);
        if (!user) {
          user = await createUser({
            googleId: profile.id,
            firstName,
            lastName,
            email: profile.emails[0].value
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}); 