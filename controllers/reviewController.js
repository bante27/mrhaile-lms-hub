const Review = require('../models/Review');
const Course = require('../models/Course');
const Asset = require('../models/Asset');
const BaseService = require('../services/BaseService');

const reviewService = new BaseService(Review);
const courseService = new BaseService(Course);
const assetService = new BaseService(Asset);

const createReview = async (req, res) => {
  try {
    const { targetId, targetType, rating, comment } = req.body;

    if (!targetId || !targetType || !rating || !comment) {
      return res.status(400).json({ message: 'Please provide targetId, targetType, rating (1-5), and comment' });
    }

    if (targetType !== 'Course' && targetType !== 'Asset') {
      return res.status(400).json({ message: 'Invalid targetType. Must be Course or Asset' });
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
      return res.status(404).json({ message: `${targetType} not found` });
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReviewsByTarget = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getReviewsByTarget };
