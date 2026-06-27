const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const roomsRoutes = require('./routes/rooms');
const moviesRoutes = require('./routes/movies');
const ordersRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

// Import socket handlers
const socketHandler = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.SITE_URL || '*',
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  maxHttpBufferSize: 1e8
});

// Database connection pool
const pool = require('./utils/db').pool;

// Session store (با استفاده از express-mysql-session)
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'cinemalivedb1-kzb-service',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'ynHj6OSMQcqvJLxsj75r',
  database: process.env.DB_NAME || 'cinemalikqh_db',
  port: process.env.DB_PORT || 3306,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
});

// Middleware
app.use(compression());
app.use(cors({
  origin: process.env.SITE_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/movies', moviesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io handlers
socketHandler(io, pool);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 سایت سینما لایو روشن شد => http://localhost:${PORT}`);
  console.log(`🌐 دامنه: ${process.env.SITE_URL}`);
});
