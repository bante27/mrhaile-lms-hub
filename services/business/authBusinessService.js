const User = require('../../models/User');
const { sendTokenResponse } = require('../../utils/generateToken');
const sendEmail = require('../../utils/sendEmail');
const cloudinary = require('../../config/cloudinary');
const axios = require('axios');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class AuthBusinessService extends BaseService {
  constructor() {
    super(User);
    this.pendingRegistrations = new Map();
  }

  async register(body) {
    const { firstName, lastName, email, phone, password } = body;
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw new AppError('User already exists with this email', 400);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    this.pendingRegistrations.set(email, {
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

    return email;
  }

  async verifyOtp(body, res) {
    const { email, otp } = body;
    const pending = this.pendingRegistrations.get(email);
    if (!pending || pending.otp !== otp || Date.now() > pending.expiresAt) {
      throw new AppError('Invalid OTP or OTP has expired', 400);
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      this.pendingRegistrations.delete(email);
      throw new AppError('User already exists with this email', 400);
    }

    const user = await super.create({
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      phone: pending.phone,
      password: pending.password,
      isVerified: true
    });

    this.pendingRegistrations.delete(email);

    if (user) {
      return sendTokenResponse(user, 201, res);
    } else {
      throw new AppError('Invalid user data', 400);
    }
  }

  async login(body, res) {
    const { email, password } = body;
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isVerified) {
      throw new AppError('Please verify your email with OTP before logging in', 401);
    }

    if (user.isBlocked) {
      throw new AppError('Your account has been restricted or blocked by the admin', 403);
    }

    if (await user.matchPassword(password)) {
      return sendTokenResponse(user, 200, res);
    } else {
      throw new AppError('Invalid email or password', 401);
    }
  }

  async getProfile(userId) {
    const { data: user, source } = await super.getById(userId, 1800);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const populatedUser = await User.findById(user._id).populate('enrolledCourses');
    return { source, ...populatedUser.toObject() };
  }

  async updateProfile(userId, body, file, res) {
    const { data: userObj } = await super.getById(userId, 1800);
    if (!userObj) {
      throw new AppError('User not found', 404);
    }

    const user = await User.findById(userId);
    const { firstName, lastName, phone, password } = body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (password) user.password = password;

    if (file) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'mrhaile_profiles' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
      user.profileImage = uploadResult.secure_url;
    }

    const updatedUser = await super.update(user._id, {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      password: user.password,
      profileImage: user.profileImage
    });

    return sendTokenResponse(updatedUser, 200, res);
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('User with this email not found', 404);
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

    return true;
  }

  async resetPassword(body) {
    const { email, otp, newPassword } = body;
    const user = await User.findOne({
      email,
      resetPasswordOtp: otp,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new AppError('Invalid OTP or OTP has expired', 400);
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return true;
  }

  async googleAuth(token, res) {
    if (!token) {
      throw new AppError('Google token is required', 400);
    }

    const googleResponse = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const { email, given_name, family_name, picture, email_verified } = googleResponse.data;

    if (!email_verified) {
      throw new AppError('Google email not verified', 400);
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8) + 'A1!';
      user = await super.create({
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

    return sendTokenResponse(user, 200, res);
  }

  async getAllUsers() {
    const { data: users, source } = await super.getAll({}, 1800, 'all-users');
    const sanitizedUsers = users.map(u => {
      const obj = u.toObject ? u.toObject() : u;
      delete obj.password;
      return obj;
    });
    return { source, users: sanitizedUsers };
  }

  async deleteUser(targetId, currentUser) {
    const { data: userToDelete } = await super.getById(targetId, 3600);
    if (!userToDelete) {
      throw new AppError('User not found', 404);
    }

    if (currentUser.role === 'admin') {
      if (userToDelete.role === 'superadmin' || userToDelete.role === 'admin') {
        throw new AppError('Regular admins cannot delete admins or super admins', 403);
      }
    }

    if (userToDelete.role === 'superadmin' && currentUser._id.toString() === userToDelete._id.toString()) {
      throw new AppError('Super admin cannot delete their own account here', 400);
    }

    return await super.delete(targetId);
  }

  async updateRole(targetId, role) {
    if (!['student', 'admin', 'instructor'].includes(role)) {
      throw new AppError('Invalid role specified', 400);
    }

    const { data: userObj } = await super.getById(targetId, 3600);
    if (!userObj) {
      throw new AppError('User not found', 404);
    }

    if (userObj.role === 'superadmin') {
      throw new AppError('Cannot modify superadmin role', 403);
    }

    const updatedUser = await super.update(targetId, { role });
    return {
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      role: updatedUser.role
    };
  }

  async toggleBlock(targetId) {
    const { data: userObj } = await super.getById(targetId, 3600);
    if (!userObj) {
      throw new AppError('User not found', 404);
    }

    const newBlockedState = !userObj.isBlocked;
    const updatedUser = await super.update(targetId, { isBlocked: newBlockedState });
    return {
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      isBlocked: updatedUser.isBlocked
    };
  }
}

module.exports = new AuthBusinessService();
