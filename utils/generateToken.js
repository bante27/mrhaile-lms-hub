const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallbacksecret', {
    expiresIn: '30d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
      role: user.role,
      token, // Included optionally for clients that need bearer tokens (e.g. mobile apps)
    });
};

module.exports = { generateToken, sendTokenResponse };
