const contactBusinessService = require('../services/business/contactBusinessService');
const catchAsync = require('../utils/catchAsync');

const submitContactMessage = catchAsync(async (req, res, next) => {
  const contactMsg = await contactBusinessService.submitMessage(req.body);
  res.status(201).json({ message: 'Message sent successfully! We will get back to you soon.', contactMsg });
});

const getContactMessages = catchAsync(async (req, res, next) => {
  const result = await contactBusinessService.fetchContactMessages();
  res.json(result);
});

module.exports = { submitContactMessage, getContactMessages };
