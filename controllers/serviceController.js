const serviceBusinessService = require('../services/business/serviceBusinessService');
const catchAsync = require('../utils/catchAsync');

const submitInquiry = catchAsync(async (req, res, next) => {
  const inquiry = await serviceBusinessService.submitInquiry(req.body);
  res.status(201).json({ message: 'Quote request submitted successfully', inquiry });
});

const getInquiries = catchAsync(async (req, res, next) => {
  const result = await serviceBusinessService.fetchInquiries();
  res.json(result);
});

const replyInquiry = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { replyMessage, status } = req.body;
  const updatedInquiry = await serviceBusinessService.replyInquiry(id, replyMessage, status);
  res.json({
    message: 'Reply sent successfully to client email',
    inquiry: updatedInquiry
  });
});

const getInquiryById = catchAsync(async (req, res, next) => {
  const result = await serviceBusinessService.fetchInquiryById(req.params.id);
  res.json(result);
});

const getMyInquiries = catchAsync(async (req, res, next) => {
  const result = await serviceBusinessService.fetchUserInquiries(req.user._id);
  res.status(200).json(result);
});

module.exports = { submitInquiry, getInquiries, getInquiryById, getMyInquiries, replyInquiry };
