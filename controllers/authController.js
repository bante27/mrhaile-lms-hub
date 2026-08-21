const User = require('../models/User');
const { sendTokenResponse } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Strict Regex validators
const nameRegex = /^[A-Za-z]+$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// In-memory temporary map for pending registrations
const pendingRegistrations = new Map();

// @desc Register new user - Save OTP in temporary memory, send email (DO NOT save user in DB yet)
// @route POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return res.status(400).json({ message: 'First name and Last name must contain letters only (no spaces, numbers, or symbols)' });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address with a correct domain (e.g. .com, .net)' });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Please provide a valid phone number' });
    }

    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    pendingRegistrations.set(email, {
      firstName,
      lastName,
      email,
      phone,
      password,
      otp,
      expiresAt
    });

    await sendEmail({
      email,
      subject: 'Registration OTP Verification - MrHaile.com',
      message: `Your registration OTP is: ${otp}. It is valid for 10 minutes.`
    });

    res.status(200).json({
      success: true,
      message: 'Registration OTP sent to email. Please verify OTP to complete registration.',
      email
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Verify Registration OTP & Save User in Database
// @route POST /api/auth/verify-registration
const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Please provide email and OTP' });
    }

    const pending = pendingRegistrations.get(email);
    if (!pending || pending.otp !== otp || Date.now() > pending.expiresAt) {
      return res.status(400).json({ message: 'Invalid OTP or OTP has expired' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      pendingRegistrations.delete(email);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      phone: pending.phone,
      password: pending.password,
      isVerified: true
    });

    pendingRegistrations.delete(email);

    if (user) {
      sendTokenResponse(user, 201, res);
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Auth user & get token
// @route POST /api/auth/login
const authUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email with OTP before logging in' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been restricted or blocked by the admin' });
    }

    if (await user.matchPassword(password)) {
      sendTokenResponse(user, 200, res);
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Logout user / clear cookie
// @route POST /api/auth/logout
const logoutUser = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get user profile
// @route GET /api/auth/profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('enrolledCourses');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update user profile (Name, phone, password, profile image)
// @route PUT /api/auth/profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { firstName, lastName, phone, password } = req.body;

    if (firstName) {
      if (!nameRegex.test(firstName)) {
        return res.status(400).json({ message: 'First name must contain letters only' });
      }
      user.firstName = firstName;
    }

    if (lastName) {
      if (!nameRegex.test(lastName)) {
        return res.status(400).json({ message: 'Last name must contain letters only' });
      }
      user.lastName = lastName;
    }

    if (phone) {
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: 'Please provide a valid phone number' });
      }
      user.phone = phone;
    }

    if (password) {
      if (!strongPasswordRegex.test(password)) {
        return res.status(400).json({ 
          message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
        });
      }
      user.password = password;
    }

    // Handle profile image upload if file is present
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'mrhaile_profiles' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        user.profileImage = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ message: 'Failed to upload profile image to Cloudinary', error: uploadError.message });
      }
    }

    const updatedUser = await user.save();

    sendTokenResponse(updatedUser, 200, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Forgot password - Send OTP
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'Password Reset OTP - MrHaile.com',
      message: `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`
    });

    res.json({ success: true, message: 'Password reset OTP sent to email successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Verify OTP & Reset Password
// @route POST /api/auth/reset-password
const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, OTP, and new password' });
    }

    if (!strongPasswordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }

    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid OTP or OTP has expired' });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Google Login / Register
// @route POST /api/auth/google
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'Google token is required' });
    }

    // Verify Google token
    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { email, given_name, family_name, picture, email_verified } = googleResponse.data;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email not verified' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Register new user via Google
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';
      user = await User.create({
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        email,
        phone: '0000000000',
        password: randomPassword,
        profileImage: picture || '',
        isVerified: true,
        role: 'student'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google Auth Error:', error.response?.data || error.message);
    res.status(400).json({ message: 'Invalid Google token', error: error.message });
  }
};

module.exports = {
  registerUser,
  verifyRegistrationOtp,
  authUser,
  logoutUser,
  googleAuth,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPasswordWithOtp
};
