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
  if (process.env.NODE_ENV !== 'production') {
    console.log('GoogleStrategy is disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set.');
  }
}

passport.serializeUser((user, done) => {
  if (process.env.NODE_ENV !== 'production') {
    const maskedUser = { ...user, email: user.email ? user.email.replace(/(.{2}).+(@.+)/, '$1***$2') : undefined, password: user.password ? '***' : undefined };
    console.log('=== SERIALIZE USER DEBUG ===');
    console.log('Serializing user:', JSON.stringify(maskedUser));
  }
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== DESERIALIZE USER DEBUG ===');
      console.log('Deserializing user ID:', id);
    }
    const user = await findUserById(id);
    if (process.env.NODE_ENV !== 'production') {
      const maskedUser = user ? { ...user, email: user.email ? user.email.replace(/(.{2}).+(@.+)/, '$1***$2') : undefined, password: user.password ? '***' : undefined } : null;
      console.log('User found from DB:', maskedUser ? JSON.stringify(maskedUser) : null);
    }
    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('\u274c User not found in DB for ID:', id);
      }
      return done(null, null);
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('\u2705 User deserialized successfully');
      console.log('====================');
    }
    done(null, user);
  } catch (err) {
    console.error('\u274c Deserialize user error:', err);
    done(err, null);
  }
}); 