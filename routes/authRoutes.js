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
  toggleBlockUser,
  updateUserRole
} = require('../controllers/authController');
const { protect, admin, superAdmin, checkEmailCredentials } = require('../middleware/authMiddleware');
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
router.get('/users', protect, admin, getUsers);
router.delete('/users/:id', protect, superAdmin, deleteUser);
router.put('/users/:id/block', protect, admin, toggleBlockUser);
router.put('/users/:id/role', protect, superAdmin, updateUserRole);

module.exports = router;
