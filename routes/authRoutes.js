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
  resetPasswordWithOtp,
  getUsers,
  deleteUser,
  toggleBlockUser
} = require('../controllers/authController');
const { protect, admin, checkEmailCredentials } = require('../middleware/authMiddleware');
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

// Admin User Management Routes
router.get('/users', protect, admin, getUsers);
router.delete('/users/:id', protect, admin, deleteUser);
router.put('/users/:id/block', protect, admin, toggleBlockUser);

module.exports = router;
