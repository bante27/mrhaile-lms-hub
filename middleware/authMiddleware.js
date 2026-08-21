const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // 1. Check Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Fallback to HttpOnly cookie
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

const superAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as a super admin' });
  }
};

// Email Credentials Check Middleware
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

module.exports = { protect, admin, superAdmin, checkEmailCredentials };
