const reviewBusinessService = require('../services/business/reviewBusinessService');
const catchAsync = require('../utils/catchAsync');

const createReview = catchAsync(async (req, res, next) => {
  const result = await reviewBusinessService.createOrUpdateReview(req.body, req.user);
  res.status(result.status).json({ message: result.message, review: result.review });
});

const getReviewsByTarget = catchAsync(async (req, res, next) => {
  const result = await reviewBusinessService.fetchReviewsByTarget(req.params.targetId);
  res.json(result);
});

module.exports = { createReview, getReviewsByTarget };
