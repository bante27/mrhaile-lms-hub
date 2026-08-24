const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('./middleware/rateLimitMiddleware');

const http = require('http');
const { Server } = require('socket.io');
const setupSocket = require('./socket/chatSocket');

// Routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const assetRoutes = require('./routes/assetRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const contactRoutes = require('./routes/contactRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const homeVideoRoutes = require('./routes/homeVideoRoutes');
const statsRoutes = require('./routes/statsRoutes');
const editingRoutes = require('./routes/editingRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Swagger Documentation
const { swaggerUi, specs } = require('./config/swagger');

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Setup Socket.IO
const chatSocketManager = setupSocket(io);
app.set('io', io);
app.set('chatSocketManager', chatSocketManager);

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'"
  );
  next();
});

const allowedOrigins = ['http://localhost:5173','http://127.0.0.1:5173' , 'http://localhost:5000','http://localhost:3000','https://mrhaile-admin.netlify.app/', process.env.FRONTEND_URL].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate limiting middleware
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const strictLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many requests, please try again later.' } });

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/home-video', homeVideoRoutes);
app.use('/api/stats', statsRoutes);

// Unified Editing Routes (Handles /api/editing, /api/editing-plans, /api/editing-orders)
app.use('/api/editing', editingRoutes);
app.use('/api/editing-plans', editingRoutes);
app.use('/api/editing-orders', editingRoutes);

app.get('/', (req, res) => {
  res.send('MrHaile.com API is running...');
});

// Swagger UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customSiteTitle: 'MrHaile.com API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
