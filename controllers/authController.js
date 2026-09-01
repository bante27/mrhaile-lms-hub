const authBusinessService = require('../services/business/authBusinessService');
const catchAsync = require('../utils/catchAsync');

const registerUser = catchAsync(async (req, res, next) => {
  const email = await authBusinessService.register(req.body);
  res.status(200).json({
    success: true,
    message: 'Registration OTP sent to email. Please verify OTP to complete registration.',
    email
  });
});

const verifyRegistrationOtp = catchAsync(async (req, res, next) => {
  await authBusinessService.verifyOtp(req.body, res);
});

const authUser = catchAsync(async (req, res, next) => {
  await authBusinessService.login(req.body, res);
});

const logoutUser = catchAsync(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const getUserProfile = catchAsync(async (req, res, next) => {
  const result = await authBusinessService.getProfile(req.user._id);
  res.json(result);
});

const updateUserProfile = catchAsync(async (req, res, next) => {
  await authBusinessService.updateProfile(req.user._id, req.body, req.file, res);
});

const forgotPassword = catchAsync(async (req, res, next) => {
  await authBusinessService.forgotPassword(req.body.email);
  res.json({ success: true, message: 'Password reset OTP sent to email successfully' });
});

const resetPasswordWithOtp = catchAsync(async (req, res, next) => {
  await authBusinessService.resetPassword(req.body);
  res.json({ success: true, message: 'Password reset successfully. You can now login.' });
});

const googleAuth = catchAsync(async (req, res, next) => {
  await authBusinessService.googleAuth(req.body.token, res);
});

const getUsers = catchAsync(async (req, res, next) => {
  const result = await authBusinessService.getAllUsers();
  res.json(result);
});

const deleteUser = catchAsync(async (req, res, next) => {
  await authBusinessService.deleteUser(req.params.id, req.user);
  res.json({ message: 'User removed successfully' });
});

const updateUserRole = catchAsync(async (req, res, next) => {
  const updatedUser = await authBusinessService.updateRole(req.params.id, req.body.role);
  res.json({
    success: true,
    message: `User role successfully updated to ${req.body.role}`,
    user: updatedUser
  });
});

const toggleBlockUser = catchAsync(async (req, res, next) => {
  const updatedUser = await authBusinessService.toggleBlock(req.params.id);
  res.json({
    success: true,
    message: `User has been ${updatedUser.isBlocked ? 'blocked' : 'unblocked'} successfully`,
    user: updatedUser
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
