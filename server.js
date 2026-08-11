const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const rateLimit = require('./middleware/rateLimitMiddleware');

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

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

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

app.get('/', (req, res) => {
  res.send('MrHaile.com API is running...');
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
