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
    const normalizedEmail = email.toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
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

// Google Strategy (only enable if env vars are set)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const [firstName, ...lastNameArr] = profile.displayName.split(' ');
        const lastName = lastNameArr.join(' ');
        const email = profile.emails[0].value;
        
        let user = await findUserByEmail(email);
        if (!user) {
          user = await createUser({
            firstName,
            lastName,
            email,
            googleId: profile.id
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
} else {
  console.log('GoogleStrategy is disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.');
}

passport.serializeUser((user, done) => {
  console.log('=== SERIALIZE USER DEBUG ===');
  console.log('Serializing user:', JSON.stringify(user));
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    console.log('=== DESERIALIZE USER DEBUG ===');
    console.log('Deserializing user ID:', id);
    const user = await findUserById(id);
    console.log('User found from DB:', user ? JSON.stringify(user) : null);
    if (!user) {
      console.log('❌ User not found in DB for ID:', id);
      return done(null, null);
    }
    console.log('✅ User deserialized successfully');
    console.log('====================');
    done(null, user);
  } catch (err) {
    console.error('❌ Deserialize user error:', err);
    done(err, null);
  }
}); 