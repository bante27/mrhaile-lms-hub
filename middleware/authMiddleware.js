const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// 1. Email Credentials Check Middleware
const checkEmailCredentials = (req, res, next) => {
    const emailUser = process.env.MAIL_USERNAME || process.env.EMAIL_USER || process.env.NODEMAILER_EMAIL;
    const emailPass = process.env.MAIL_PASSWORD || process.env.EMAIL_PASS || process.env.NODEMAILER_PASS;
    
    if (!emailUser || !emailPass) {
        return res.status(500).json({ 
            success: false, 
            error: 'Email service credentials missing' 
        });
    }
    next();
};

module.exports = { protect, admin, checkEmailCredentials };
