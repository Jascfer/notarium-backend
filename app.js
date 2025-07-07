// Express app.js dosyası
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

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