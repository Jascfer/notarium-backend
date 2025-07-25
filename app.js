// Express app.js - Tamamen yeniden yazıldı
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const cookieParser = require('cookie-parser');
const config = require('./config/environment');

// Environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// PostgreSQL Pool
const pgPool = new Pool({
  connectionString: config.POSTGRES_URL,
  ssl: config.isProduction ? { rejectUnauthorized: false } : false
});

// CORS Configuration - Cloudflare için optimize edildi
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const isAllowed = config.isOriginAllowed(origin);
    
    if (isAllowed) {
      return callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Cloudflare için kritik
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// OPTIONS requests handler
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Test session store connection
const sessionStore = new pgSession({
  pool: pgPool,
  tableName: 'sessions',
  createTableIfMissing: true
});

sessionStore.on('connect', () => {
  console.log('✅ Session store connected successfully');
});

sessionStore.on('error', (error) => {
  console.error('❌ Session store error:', error);
});

// Session configuration - Cloudflare için optimize edildi
const sessionConfig = {
  store: sessionStore,
  secret: config.SESSION_SECRET,
  resave: false, // Session'ı sadece değiştiğinde kaydet
  saveUninitialized: false, // Boş session'ları kaydetme
  name: 'connect.sid',
  cookie: {
    secure: config.COOKIE_SECURE, // Railway & Cloudflare => HTTPS
    sameSite: config.COOKIE_SAME_SITE, // Cross-domain cookie için 'none'
    httpOnly: true,
    maxAge: config.COOKIE_MAX_AGE, //1 gün (rehberdeki öneri)
    path: '/',
    domain: config.isProduction ? config.COOKIE_DOMAIN : undefined // Bunu aktif ettim!
  },
  proxy: config.isProduction // Railway proxy kullanıyor
};

app.use(session(sessionConfig));

// Passport configuration
require('./config/passport');
const passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());

// Session debugging middleware - AFTER Passport middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('=== SESSION DEBUG ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session exists:', !!req.session);
    console.log('Session passport:', req.session?.passport);
    console.log('User authenticated:', req.isAuthenticated());
    console.log('req.headers.cookie:', req.headers.cookie);
    console.log('Full session object:', req.session);
    console.log('====================');
  }
  next();
});

// Trust proxy for Railway
if (config.isProduction) {
  app.set('trust proxy', 1);
}

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const notesRoutes = require('./routes/notes');
app.use('/api/notes', notesRoutes);

const quizRoutes = require('./routes/quiz');
app.use('/api/quiz', quizRoutes);

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

const supportRoutes = require('./routes/support');
app.use('/api/support', supportRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Notarium Backend API',
    status: 'running',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT NOW() as time, version() as version');
    res.json({ 
      success: true, 
      time: result.rows[0].time,
      version: result.rows[0].version
    });
  } catch (err) {
    console.error('Database test error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Socket.io Configuration
const io = new Server(server, {
  cors: {
    origin: config.getAllowedOrigins(),
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Socket.io middleware for authentication
io.use((socket, next) => {
  // Session'ı socket'e ekle
  const session = socket.request.session;
  if (session && session.passport && session.passport.user) {
    socket.userId = session.passport.user;
    return next();
  }
  // Auth olmayan kullanıcılar da bağlanabilir ama sınırlı erişim
  return next();
});

// Chat system variables
const channelMessages = {
  'ders-yardim': [],
  'sinav-taktikleri': [],
  'kampus-geyikleri': [],
  'etkinlik-duyurular': []
};

let onlineUsers = {};
let bannedUserIds = [];

// Socket.io connection handler
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Socket connected:', socket.id, 'User ID:', socket.userId);
  }
  
  // Kullanıcı giriş yaptığında bilgisini al
  socket.on('userOnline', (userInfo) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('User online:', userInfo);
    }
    
    // Banlıysa bağlantıyı kes
    if (bannedUserIds.includes(userInfo.id)) {
      socket.emit('banned');
      socket.disconnect();
      return;
    }
    
    onlineUsers[socket.id] = {
      ...userInfo,
      socketId: socket.id,
      connectedAt: new Date()
    };
    
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Kanal mesajlarını gönder
  socket.on('joinChannel', (channel) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('User joined channel:', channel, 'Socket:', socket.id);
    }
    socket.join(channel);
    socket.emit('chatHistory', channelMessages[channel] || []);
  });

  // Mesaj gönderildiğinde
  socket.on('sendMessage', ({ channel, message }) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Message sent to channel:', channel);
    }
    
    // Etkinlik Duyuruları kanalına sadece adminler mesaj gönderebilir
    if (channel === 'etkinlik-duyurular') {
      const sender = Object.values(onlineUsers).find(u => u.id === message.id || u.name === message.user);
      if (!sender || (sender.role !== 'admin' && sender.role !== 'founder')) {
        socket.emit('errorMessage', 'Bu kanala sadece adminler mesaj gönderebilir.');
        return;
      }
    }
    
    if (!channelMessages[channel]) channelMessages[channel] = [];
    channelMessages[channel].push(message);
    
    // Mesaj geçmişini sınırla (son 100 mesaj)
    if (channelMessages[channel].length > 100) {
      channelMessages[channel] = channelMessages[channel].slice(-100);
    }
    
    io.to(channel).emit('newMessage', message);
  });

  // Admin tarafından kullanıcıyı banla
  socket.on('banUser', (userId) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Ban request for user:', userId);
    }
    
    const adminUser = onlineUsers[socket.id];
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'founder')) {
      socket.emit('errorMessage', 'Bu işlem için yetkiniz yok.');
      return;
    }
    
    bannedUserIds.push(userId);
    
    // Banlanan kullanıcıyı bulup bağlantısını kes
    let foundUser = false;
    for (const [sockId, u] of Object.entries(onlineUsers)) {
      if (u.id === userId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Banning user:', u.name);
        }
        io.to(sockId).emit('banned');
        io.sockets.sockets.get(sockId)?.disconnect();
        delete onlineUsers[sockId];
        foundUser = true;
        break;
      }
    }
    
    if (!foundUser) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User to ban not found:', userId);
      }
    }
    
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Admin tarafından kullanıcıyı uzaklaştır (kick)
  socket.on('kickUser', (userId) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Kick request for user:', userId);
    }
    
    const adminUser = onlineUsers[socket.id];
    if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'founder')) {
      socket.emit('errorMessage', 'Bu işlem için yetkiniz yok.');
      return;
    }
    
    let foundUser = false;
    for (const [sockId, u] of Object.entries(onlineUsers)) {
      if (u.id === userId) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Kicking user:', u.name);
        }
        io.to(sockId).emit('kicked');
        io.sockets.sockets.get(sockId)?.disconnect();
        delete onlineUsers[sockId];
        foundUser = true;
        break;
      }
    }
    
    if (!foundUser) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('User to kick not found:', userId);
      }
    }
    
    io.emit('onlineUsers', Object.values(onlineUsers));
  });

  // Kullanıcı bağlantıyı kopardığında
  socket.on('disconnect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Socket disconnected:', socket.id);
    }
    delete onlineUsers[socket.id];
    io.emit('onlineUsers', Object.values(onlineUsers));
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: config.isDevelopment ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Server start
const PORT = config.PORT;

// Founder setup script'ini import et
const { setupFounder } = require('./setup-founder');

async function startServer() {
  try {
    // Test session store and database connection
    console.log('🔍 Testing session store and database connection...');
    try {
      // Test if sessions table exists
      const tableCheck = await pgPool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'sessions'        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ Sessions table exists');
        
        // Test session store operations
        const testSessionId = 'test-session-' + Date.now();
        await sessionStore.set(testSessionId, { test: 'data' });
        const retrieved = await sessionStore.get(testSessionId);
        await sessionStore.destroy(testSessionId);
        
        if (retrieved && retrieved.test === 'data') {
          console.log('✅ Session store is working correctly');
        } else {
          console.log('⚠️ Session store test failed');
        }
      } else {
        console.log('⚠️  Sessions table does not exist, will be created');
      }
    } catch (error) {
      console.error('❌ Session store test failed:', error.message);
    }
    
    // Production'da founder rolünü ata
    if (config.isProduction) {
      console.log('👑 Production ortamında founder rolü kontrol ediliyor...');
      try {
        await setupFounder();
      } catch (error) {
        console.log('⚠️  Founder rolü atama hatası (devam ediliyor):', error.message);
      }
    }
    
    // Server'ı başlat
    server.listen(PORT, () => {
      console.log(`🚀 Notarium Backend Server running on port ${PORT}`);
      console.log(`📊 Environment: ${config.NODE_ENV}`);
      console.log(`🔗 Backend URL: ${config.BACKEND_URL}`);
      console.log(`🌐 Frontend URL: ${config.FRONTEND_URL}`);
      console.log(`🍪 Cookie Domain: ${config.COOKIE_DOMAIN}`);
      console.log(`🔒 Cookie Secure: ${config.COOKIE_SECURE}`);
      console.log(`🌍 Cookie SameSite: ${config.COOKIE_SAME_SITE}`);
    });
  } catch (error) {
    console.error('❌ Server başlatma hatası:', error);
    process.exit(1);
  }
}

startServer();