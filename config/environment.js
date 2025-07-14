// Environment Configuration
require('dotenv').config();

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 4000,
  
  // Database
  POSTGRES_URL: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'gizli-session-secret-key-change-this-in-production',
  
  // Google OAuth (Optional)
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'https://notarium-backend-production.up.railway.app/auth/google/callback',
  
  // Frontend URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://notarium.tr',
  FRONTEND_URL_WWW: process.env.FRONTEND_URL_WWW || 'https://www.notarium.tr',
  FRONTEND_URL_LOCAL: process.env.FRONTEND_URL_LOCAL || 'http://localhost:3000',
  
  // Cookie Settings
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '.notarium.tr',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  
  // API URLs
  BACKEND_URL: process.env.BACKEND_URL || 'https://notarium-backend-production.up.railway.app',
  
  // Environment checks
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Allowed origins for CORS
  getAllowedOrigins: () => [
    config.FRONTEND_URL,
    config.FRONTEND_URL_WWW,
    config.FRONTEND_URL_LOCAL,
    'https://*.preview.devprod.cloudflare.dev',
    'https://*.workers.dev'
  ]
};

module.exports = config; 