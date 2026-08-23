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

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, profile management, and admin user control
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Registers a new user and sends verification OTP.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Secret123!
 *     responses:
 *       201:
 *         description: User registered successfully. OTP sent to email.
 *       400:
 *         description: Validation error or user already exists
 *       500:
 *         description: Server error
 */
router.post('/register', registerUser);

/**
 * @swagger
 * /api/auth/verify-registration:
 *   post:
 *     summary: Verify registration OTP
 *     description: Verifies the OTP sent to user's email during registration.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Account verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Server error
 */
router.post('/verify-registration', verifyRegistrationOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate user & get token
 *     description: Logs in a user with email and password, returning a JWT token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Secret123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 60d0fe4f5311236168a109ca
 *                 name:
 *                   type: string
 *                   example: John Doe
 *                 email:
 *                   type: string
 *                   example: john@example.com
 *                 role:
 *                   type: string
 *                   example: user
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Server error
 */
router.post('/login', authUser);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Clears authentication cookies.
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       500:
 *         description: Server error
 */
router.post('/logout', logoutUser);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google OAuth authentication
 *     description: Authenticates user via Google credential token.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential
 *             properties:
 *               credential:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIs...
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       400:
 *         description: Google auth failed
 *       500:
 *         description: Server error
 */
router.post('/google', googleAuth);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     description: Retrieves logged in user's profile information. Requires Bearer Token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Not authorized, token failed or missing
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update user profile
 *     description: Updates logged in user's profile (name, email, password, profile image). Requires Bearer Token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Updated
 *               email:
 *                 type: string
 *                 example: john.updated@example.com
 *               password:
 *                 type: string
 *                 example: NewSecret123!
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('profileImage'), updateUserProfile);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     description: Sends a password reset OTP to user email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Password reset OTP sent to email
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/forgot-password', checkEmailCredentials, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with OTP
 *     description: Resets password using OTP sent to email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: BrandNewPass123!
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Server error
 */
router.post('/reset-password', resetPasswordWithOtp);

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: Get all users (Admin)
 *     description: Retrieves list of all users. Requires Admin role and Bearer Token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/users', protect, admin, getUsers);

/**
 * @swagger
 * /api/auth/users/{id}:
 *   delete:
 *     summary: Delete user (SuperAdmin)
 *     description: Deletes a user by ID. Requires SuperAdmin role and Bearer Token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: SuperAdmin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/users/:id', protect, superAdmin, deleteUser);

/**
 * @swagger
 * /api/auth/users/{id}/block:
 *   put:
 *     summary: Block/Unblock user (Admin)
 *     description: Toggles user block status. Requires Admin role and Bearer Token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User block status toggled successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/users/:id/block', protect, admin, toggleBlockUser);

/**
 * @swagger
 * /api/auth/users/{id}/role:
 *   put:
 *     summary: Update user role (SuperAdmin)
 *     description: Updates user role (user/admin/superadmin). Requires SuperAdmin role and Bearer Token.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, superadmin]
 *                 example: admin
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: SuperAdmin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/users/:id/role', protect, superAdmin, updateUserRole);

module.exports = router;
