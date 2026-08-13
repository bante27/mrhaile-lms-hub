const express = require('express');
const router = express.Router();
const {
  registerUser,
  verifyRegistrationOtp,
  authUser,
  logoutUser,
  googleAuth,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPasswordWithOtp
} = require('../controllers/authController');
const { protect, checkEmailCredentials } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/register', registerUser);
router.post('/verify-registration', verifyRegistrationOtp);
router.post('/login', authUser);
router.post('/logout', logoutUser);
router.post('/google', googleAuth);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('profileImage'), updateUserProfile);
router.post('/forgot-password', checkEmailCredentials, forgotPassword);
router.post('/reset-password', resetPasswordWithOtp);

module.exports = router;
