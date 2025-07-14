// Express app.js dosyası
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');

// Environment variables
require('dotenv').config();

const app = express();
const allowedOrigins = [
  'https://notarium.up.railway.app',
  'https://www.notarium.up.railway.app',
  'https://notarium.tr',
  'https://www.notarium.tr',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:8080',
  // Cloudflare Worker preview domains
  'https://*.preview.devprod.cloudflare.dev',
  'https://*.workers.dev',
  'https://799d8575-035b-4ccc-88ac-60fc1d1a1135.preview.devprod.cloudflare.dev'
];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware'ini ekle
app.use(cookieParser());

// CORS middleware - daha güvenli konfigürasyon
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://notarium.tr',
      'https://www.notarium.tr',
      'http://localhost:3000',
      // Add your actual frontend domain
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));

// OPTIONS isteklerini handle et
app.options('*', cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://notarium.tr',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Environment kontrolü
const isProduction = process.env.NODE_ENV === 'production';
console.log('Environment:', process.env.NODE_ENV);
console.log('Is Production:', isProduction);
console.log('Session Secret:', process.env.SESSION_SECRET ? 'Set' : 'Not Set');

app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'gizli-session-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid', // Session cookie adını belirt
  cookie: {
    secure: isProduction, // Sadece production'da true
    sameSite: isProduction ? 'none' : 'lax', // Production'da none, development'ta lax
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 saat
    path: '/',
    // domain: '.notarium.tr' // Bu satırı kaldırıyoruz
  }
}));

// PASSPORT CONFIG EKLENDİ
require('./config/passport');
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

// AUTH ROUTE EKLENDİ
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Test endpoint for database connection
app.get('/test-db', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bellekte kanal bazlı mesajlar
const channelMessages = {
  'ders-yardim': [],
  'sinav-taktikleri': [],
  'kampus-geyikleri': [],
  'etkinlik-duyurular': []
};

// Çevrimiçi kullanıcılar (socketId -> userInfo)
let onlineUsers = {};

// Banlanan kullanıcıların id'leri
let bannedUserIds = [];

io.on('connection', (socket) => {
  // Kullanıcı giriş yaptığında bilgisini al
  socket.on('userOnline', (userInfo) => {
    // Banlıysa bağlantıyı kes
    if (bannedUserIds.includes(userInfo.id)) {
      socket.emit('banned');
      socket.disconnect();
      return;
    }
    onlineUsers[socket.id] = userInfo;
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Kanal mesajlarını gönder
  socket.on('joinChannel', (channel) => {
    socket.join(channel);
    socket.emit('chatHistory', channelMessages[channel] || []);
  });

  // Mesaj gönderildiğinde
  socket.on('sendMessage', ({ channel, message }) => {
    // Etkinlik Duyuruları kanalına sadece adminler mesaj gönderebilir
    if (channel === 'etkinlik-duyurular') {
      const sender = Object.values(onlineUsers).find(u => u.id === message.id || u.name === message.user);
      if (!sender || sender.role !== 'admin') {
        socket.emit('errorMessage', 'Bu kanala sadece adminler mesaj gönderebilir.');
        return;
      }
    }
    if (!channelMessages[channel]) channelMessages[channel] = [];
    channelMessages[channel].push(message);
    io.to(channel).emit('newMessage', message);
  });

  // Admin tarafından kullanıcıyı banla
  socket.on('banUser', (userId) => {
    console.log('Banlama isteği alındı:', userId);
    console.log('Mevcut kullanıcılar:', onlineUsers);
    
    bannedUserIds.push(userId);
    
    // Banlanan kullanıcıyı bulup bağlantısını kes
    let foundUser = false;
    for (const [sockId, u] of Object.entries(onlineUsers)) {
      if (u.id === userId) {
        console.log('Banlanan kullanıcı bulundu:', u.name);
        io.to(sockId).emit('banned');
        io.sockets.sockets.get(sockId)?.disconnect();
        delete onlineUsers[sockId];
        foundUser = true;
        break;
      }
    }
    
    if (!foundUser) {
      console.log('Banlanacak kullanıcı bulunamadı:', userId);
    }
    
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Admin tarafından kullanıcıyı uzaklaştır (kick)
  socket.on('kickUser', (userId) => {
    console.log('Kick isteği alındı:', userId);
    
    let foundUser = false;
    for (const [sockId, u] of Object.entries(onlineUsers)) {
      if (u.id === userId) {
        console.log('Uzaklaştırılan kullanıcı bulundu:', u.name);
        io.to(sockId).emit('kicked');
        io.sockets.sockets.get(sockId)?.disconnect();
        delete onlineUsers[sockId];
        foundUser = true;
        break;
      }
    }
    
    if (!foundUser) {
      console.log('Uzaklaştırılacak kullanıcı bulunamadı:', userId);
    }
    
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Kullanıcı bağlantıyı kopardığında
  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('onlineUsers', Object.values(onlineUsers));
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.io sohbet sunucusu ${PORT} portunda çalışıyor.`);
});