const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');

// Strict Regex validators
const nameRegex = /^[A-Za-z]+$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

// @desc Register new user
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

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        token: generateToken(user._id),
      });
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

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
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

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profileImage: updatedUser.profileImage,
      role: updatedUser.role,
      token: generateToken(updatedUser._id)
    });
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
    
    await User.updateOne(
      { email },
      { 
        $set: { 
          resetPasswordOtp: otp, 
          resetPasswordExpires: Date.now() + 10 * 60 * 1000 
        } 
      }
    );

    await sendEmail({
      email: user.email,
      subject: 'Password Reset OTP - MrHaile.com',
      message: `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`
    });

    res.json({ message: 'Password reset OTP sent to email successfully' });
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await User.updateOne(
      { email },
      { 
        $set: { password: hashedPassword },
        $unset: { resetPasswordOtp: 1, resetPasswordExpires: 1 }
      }
    );

    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, authUser, getUserProfile, updateUserProfile, forgotPassword, resetPasswordWithOtp };
