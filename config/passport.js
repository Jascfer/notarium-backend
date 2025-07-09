const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const { findUserByEmail, findUserById, createUser } = require('../models/User');
const bcrypt = require('bcryptjs');

passport.use(new LocalStrategy({
  usernameField: 'email'
}, async (email, password, done) => {
  try {
    console.log('Passport: Attempting login for email:', email);
    const user = await findUserByEmail(email);
    if (!user) {
      console.log('Passport: User not found for email:', email);
      return done(null, false, { message: 'Kullanıcı bulunamadı.' });
    }
    console.log('Passport: User found:', user.id, user.email);
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      console.log('Passport: Password mismatch for user:', user.email);
      return done(null, false, { message: 'Şifre yanlış.' });
    }
    console.log('Passport: Authentication successful for user:', user.email);
    return done(null, user);
  } catch (err) {
    console.log('Passport: Error during authentication:', err);
    return done(err);
  }
}));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const [firstName, ...lastNameArr] = profile.displayName.split(' ');
      const lastName = lastNameArr.join(' ');
      let user = await findUserByEmail(profile.emails[0].value);
      if (!user) {
        user = await createUser({
          firstName,
          lastName,
          email: profile.emails[0].value,
          google_id: profile.id
        });
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
// Do not export anything from this file! 