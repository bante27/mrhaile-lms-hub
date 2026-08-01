const express = require('express');
const router = express.Router();
const {
  registerUser,
  authUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPasswordWithOtp
} = require('../controllers/authController');
const { protect, checkEmailCredentials } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('profileImage'), updateUserProfile);
router.post('/forgot-password', checkEmailCredentials, forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);

module.exports = router;
