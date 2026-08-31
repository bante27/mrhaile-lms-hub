const Review = require('../models/Review');
const Course = require('../models/Course');
const Asset = require('../models/Asset');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const reviewService = new BaseService(Review);
const courseService = new BaseService(Course);
const assetService = new BaseService(Asset);

const createReview = catchAsync(async (req, res, next) => {
  const { targetId, targetType, rating, comment } = req.body;

  if (targetType !== 'Course' && targetType !== 'Asset') {
    return next(new AppError('Invalid targetType. Must be Course or Asset', 400));
  }

  let targetExists = null;
  if (targetType === 'Course') {
    const { data: course } = await courseService.getById(targetId, 3600);
    targetExists = course;
  } else {
    const { data: asset } = await assetService.getById(targetId, 3600);
    targetExists = asset;
  }

  if (!targetExists) {
    return next(new AppError(`${targetType} not found`, 404));
  }

  const alreadyReviewed = await Review.findOne({ user: req.user._id, targetId });
  if (alreadyReviewed) {
    alreadyReviewed.rating = Number(rating);
    alreadyReviewed.comment = comment;
    await alreadyReviewed.save();
    await reviewService.invalidatePattern(`review:*`);
    return res.json({ message: 'Review updated successfully', review: alreadyReviewed });
  }

  const review = await reviewService.create({
    user: req.user._id,
    targetId,
    targetType,
    rating: Number(rating),
    comment
  });

  res.status(201).json({ message: 'Review added successfully', review });
});

const getReviewsByTarget = catchAsync(async (req, res, next) => {
  const { targetId } = req.params;
  const { data: reviews, source } = await reviewService.getAll({ targetId }, 1800, `target-${targetId}`);

  const populatedReviews = await Review.populate(reviews, { path: 'user', select: 'firstName lastName profileImage' });

  let avgRating = 0;
  if (populatedReviews.length > 0) {
    const sum = populatedReviews.reduce((acc, item) => acc + item.rating, 0);
    avgRating = (sum / populatedReviews.length).toFixed(1);
  }

  res.json({
    source,
    count: populatedReviews.length,
    averageRating: Number(avgRating),
    reviews: populatedReviews
  });
});

module.exports = { createReview, getReviewsByTarget };
