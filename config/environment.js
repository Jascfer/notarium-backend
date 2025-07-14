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
  
  // Frontend URLs - Cloudflare ile uyumlu
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://notarium.tr',
  FRONTEND_URL_WWW: process.env.FRONTEND_URL_WWW || 'https://www.notarium.tr',
  FRONTEND_URL_LOCAL: process.env.FRONTEND_URL_LOCAL || 'http://localhost:3000',
  
  // Cookie Settings - Cloudflare için optimize edildi
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || '.notarium.tr',
  COOKIE_SECURE: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  COOKIE_MAX_AGE: 86400000, // 1 gün (rehberdeki öneri)
  
  // API URLs
  BACKEND_URL: process.env.BACKEND_URL || 'https://notarium-backend-production.up.railway.app',
  
  // Environment checks
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Allowed origins for CORS - Cloudflare ile uyumlu
  getAllowedOrigins: () => [
    config.FRONTEND_URL,
    config.FRONTEND_URL_WWW,
    config.FRONTEND_URL_LOCAL,
    // Railway test için geçici olarak ekle
    'https://notarium.up.railway.app',
    // Cloudflare preview domains - daha spesifik pattern'ler
    'https://preview.devprod.cloudflare.dev',
    'https://*.preview.devprod.cloudflare.dev',
    'https://*.workers.dev',
    'https://*.pages.dev',
    // Development için
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  ],
  
  // CORS origin check function - daha gelişmiş pattern matching
  isOriginAllowed: (origin) => {
    if (!origin) return true; // Allow requests with no origin
    
    const allowedOrigins = config.getAllowedOrigins();
    
    return allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === origin) return true;
      
      // Wildcard pattern matching
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace('*', '');
        return origin.includes(pattern);
      }
      
      return false;
    });
  }
};

module.exports = config; 