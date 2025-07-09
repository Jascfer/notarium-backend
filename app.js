// Express app.js dosyası
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const session = require('express-session');
require('./config/passport'); // Configure passport (side effect)
const passport = require('passport'); // Get the configured passport instance
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const ChatMessage = require('./models/ChatMessage'); // EKLENDİ

console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://mongo:YvFJGbyNxePZwHwdgsgBvObpeRVpdhkr@shuttle.proxy.rlwy.net:14555');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongo:YvFJGbyNxePZwHwdgsgBvObpeRVpdhkr@shuttle.proxy.rlwy.net:14555', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB bağlantısı başarılı!'))
.catch(err => {
  console.error('❌ MongoDB bağlantı hatası:', err);
  console.error('MongoDB URI:', process.env.MONGODB_URI);
});

const app = express();

// Debug: Environment variables
console.log('Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '***' : 'undefined');
console.log('- PORT:', process.env.PORT);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: ['https://notarium.tr'],
  credentials: true
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gizli',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 saat
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Backend is running!',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

app.use('/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/chat', require('./routes/chat'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
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
  socket.on('joinChannel', async (channel) => {
    socket.join(channel);
    // --- YENİ: Kanal geçmişini MongoDB'den çek ---
    try {
      const messages = await ChatMessage.find({ channel }).populate('user', 'firstName lastName email').sort({ createdAt: 1 });
      socket.emit('chatHistory', messages);
    } catch (err) {
      console.error('Kanal geçmişi alınamadı:', err);
      socket.emit('chatHistory', []);
    }
  });

  // Mesaj gönderildiğinde
  socket.on('sendMessage', async ({ channel, message }) => {
    // Etkinlik Duyuruları kanalına sadece adminler mesaj gönderebilir
    if (channel === 'etkinlik-duyurular') {
      const sender = Object.values(onlineUsers).find(u => u.id === message.id || u.name === message.user);
      if (!sender || sender.role !== 'admin') {
        socket.emit('errorMessage', 'Bu kanala sadece adminler mesaj gönderebilir.');
        return;
      }
    }
    // --- YENİ: Mesajı MongoDB'ye kaydet ---
    try {
      // user alanı: message.userId (frontend'den ObjectId gelmeli!)
      const savedMsg = await ChatMessage.create({
        channel,
        user: message.userId, // ObjectId olmalı
        message: message.message
      });
      // Kullanıcı bilgisiyle populate et
      const populatedMsg = await ChatMessage.findById(savedMsg._id).populate('user', 'firstName lastName email');
      io.to(channel).emit('newMessage', populatedMsg);
    } catch (err) {
      console.error('Chat mesajı MongoDB\'ye kaydedilemedi:', err);
      socket.emit('errorMessage', 'Mesaj kaydedilemedi.');
    }
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