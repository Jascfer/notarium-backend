// Express app.js dosyası
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const app = express();
const allowedOrigins = [
  'https://notarium.up.railway.app',
  'https://www.notarium.up.railway.app',
  'https://notarium.tr',
  'https://www.notarium.tr',
  'http://localhost:3000',
  'http://localhost:4000',
  'http://localhost:8080'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // Origin yoksa izin ver
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const pgPool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:eAnTWVlXpaiFluEOPgwGXVHIyNEsMZJI@postgres.railway.internal:5432/railway',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.use(session({
  store: new pgSession({
    pool: pgPool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'gizli',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 saat
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