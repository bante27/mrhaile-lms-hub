const User = require('../models/User');
const { sendTokenResponse } = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const bcrypt = require('bcryptjs');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const userService = new BaseService(User);
const pendingRegistrations = new Map();

const registerUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, phone, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    return next(new AppError('User already exists with this email', 400));
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
});

const verifyRegistrationOtp = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;

  const pending = pendingRegistrations.get(email);
  if (!pending || pending.otp !== otp || Date.now() > pending.expiresAt) {
    return next(new AppError('Invalid OTP or OTP has expired', 400));
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    pendingRegistrations.delete(email);
    return next(new AppError('User already exists with this email', 400));
  }

  const user = await userService.create({
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
    return next(new AppError('Invalid user data', 400));
  }
});

const authUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (!user.isVerified) {
    return next(new AppError('Please verify your email with OTP before logging in', 401));
  }

  if (user.isBlocked) {
    return next(new AppError('Your account has been restricted or blocked by the admin', 403));
  }

  if (await user.matchPassword(password)) {
    sendTokenResponse(user, 200, res);
  } else {
    return next(new AppError('Invalid email or password', 401));
  }
});

const logoutUser = catchAsync(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const getUserProfile = catchAsync(async (req, res, next) => {
  const { data: user, source } = await userService.getById(req.user._id, 1800);
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  const populatedUser = await User.findById(user._id).populate('enrolledCourses');
  res.json({ source, ...populatedUser.toObject() });
});

const updateUserProfile = catchAsync(async (req, res, next) => {
  const { data: userObj } = await userService.getById(req.user._id, 1800);
  if (!userObj) {
    return next(new AppError('User not found', 404));
  }

  const user = await User.findById(req.user._id);
  const { firstName, lastName, phone, password } = req.body;

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (password) user.password = password;

  if (req.file) {
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
  }

  const updatedUser = await userService.update(user._id, {
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    password: user.password,
    profileImage: user.profileImage
  });

  sendTokenResponse(updatedUser, 200, res);
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('User with this email not found', 404));
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
});

const resetPasswordWithOtp = catchAsync(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({
    email,
    resetPasswordOtp: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('Invalid OTP or OTP has expired', 400));
  }

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now login.' });
});

const googleAuth = catchAsync(async (req, res, next) => {
  const { token } = req.body;
  if (!token) {
    return next(new AppError('Google token is required', 400));
  }

  const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  const { email, given_name, family_name, picture, email_verified } = googleResponse.data;

  if (!email_verified) {
    return next(new AppError('Google email not verified', 400));
  }

  let user = await User.findOne({ email });

  if (!user) {
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';
    user = await userService.create({
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
});

const getUsers = catchAsync(async (req, res, next) => {
  const { data: users, source } = await userService.getAll({}, 1800, 'all-users');
  const sanitizedUsers = users.map(u => {
    const obj = u.toObject ? u.toObject() : u;
    delete obj.password;
    return obj;
  });
  res.json({ source, users: sanitizedUsers });
});

const deleteUser = catchAsync(async (req, res, next) => {
  const { data: userToDelete } = await userService.getById(req.params.id, 3600);
  if (!userToDelete) {
    return next(new AppError('User not found', 404));
  }

  if (req.user.role === 'admin') {
    if (userToDelete.role === 'superadmin' || userToDelete.role === 'admin') {
      return next(new AppError('Regular admins cannot delete admins or super admins', 403));
    }
  }

  if (userToDelete.role === 'superadmin' && req.user._id.toString() === userToDelete._id.toString()) {
    return next(new AppError('Super admin cannot delete their own account here', 400));
  }

  await userService.delete(req.params.id);
  res.json({ message: 'User removed successfully' });
});

const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  if (!['student', 'admin', 'instructor'].includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  const { data: userObj } = await userService.getById(req.params.id, 3600);
  if (!userObj) {
    return next(new AppError('User not found', 404));
  }

  if (userObj.role === 'superadmin') {
    return next(new AppError('Cannot modify superadmin role', 403));
  }

  const updatedUser = await userService.update(req.params.id, { role });

  res.json({
    success: true,
    message: `User role successfully updated to ${role}`,
    user: {
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role
    }
  });
});

const toggleBlockUser = catchAsync(async (req, res, next) => {
  const { data: userObj } = await userService.getById(req.params.id, 3600);
  if (!userObj) {
    return next(new AppError('User not found', 404));
  }

  const newBlockedState = !userObj.isBlocked;
  const updatedUser = await userService.update(req.params.id, { isBlocked: newBlockedState });

  res.json({
    success: true,
    message: `User has been ${newBlockedState ? 'blocked' : 'unblocked'} successfully`,
    user: {
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      isBlocked: updatedUser.isBlocked
    }
  });
});

module.exports = {
  registerUser,
  verifyRegistrationOtp,
  authUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  resetPasswordWithOtp,
  googleAuth,
  getUsers,
  deleteUser,
  updateUserRole,
  toggleBlockUser
};
