const newsletterBusinessService = require('../services/business/newsletterBusinessService');
const catchAsync = require('../utils/catchAsync');

const subscribeNewsletter = catchAsync(async (req, res, next) => {
  const subscriber = await newsletterBusinessService.subscribe(req.body.email);
  res.status(201).json({ message: 'Subscribed successfully! Check your email for updates.', subscriber });
});

const broadcastNewsletter = catchAsync(async (req, res, next) => {
  const { subject, message } = req.body;
  const result = await newsletterBusinessService.broadcast(subject, message);
  res.json({ message: `Broadcast sent successfully to ${result.successCount} of ${result.total} subscribers!` });
});

const getSubscribers = catchAsync(async (req, res, next) => {
  const result = await newsletterBusinessService.fetchSubscribers();
  res.json(result);
});

module.exports = { subscribeNewsletter, broadcastNewsletter, getSubscribers };
