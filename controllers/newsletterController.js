const Newsletter = require('../models/Newsletter');
const sendEmail = require('../utils/sendEmail');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const newsletterService = new BaseService(Newsletter);

const subscribeNewsletter = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const subscribers = await Newsletter.find({ email });
  if (subscribers.length > 0) {
    return next(new AppError('This email is already subscribed to our newsletter!', 400));
  }

  const subscriber = await newsletterService.create({ email });

  await sendEmail({
    email,
    subject: 'Welcome to MrHaile.com Newsletter!',
    message: `Hello,\n\nThank you for subscribing to MrHaile.com! You will now receive weekly stock footage drops, free presets, and video editing masterclass tips directly in your inbox.\n\nStay tuned for our latest updates!\n\nBest regards,\nMrHaile.com Team`
  });

  res.status(201).json({ message: 'Subscribed successfully! Check your email for updates.', subscriber });
});

const broadcastNewsletter = catchAsync(async (req, res, next) => {
  const { subject, message } = req.body;

  const { data: subscribers } = await newsletterService.getAll({}, 3600, 'all-subscribers');
  if (!subscribers || subscribers.length === 0) {
    return next(new AppError('No newsletter subscribers found', 404));
  }

  let successCount = 0;
  for (const sub of subscribers) {
    await sendEmail({
      email: sub.email,
      subject,
      message: `${message}\n\n---\nYou are receiving this email because you subscribed to MrHaile.com.`
    });
    successCount++;
  }

  res.json({ message: `Broadcast sent successfully to ${successCount} of ${subscribers.length} subscribers!` });
});

const getSubscribers = catchAsync(async (req, res, next) => {
  const { data: subscribers, source } = await newsletterService.getAll({}, 1800, 'all-subscribers');
  res.json({ source, count: subscribers.length, subscribers });
});

module.exports = { subscribeNewsletter, broadcastNewsletter, getSubscribers };
