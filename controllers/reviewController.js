const Review = require('../models/Review');
const Course = require('../models/Course');
const Asset = require('../models/Asset');

// @desc Add a review & rating to a Course or Asset
// @route POST /api/reviews
const createReview = async (req, res) => {
  try {
    const { targetId, targetType, rating, comment } = req.body;

    if (!targetId || !targetType || !rating || !comment) {
      return res.status(400).json({ message: 'Please provide targetId, targetType, rating (1-5), and comment' });
    }

    if (targetType !== 'Course' && targetType !== 'Asset') {
      return res.status(400).json({ message: 'Invalid targetType. Must be Course or Asset' });
    }

    // Check if target exists
    let targetExists = null;
    if (targetType === 'Course') {
      targetExists = await Course.findById(targetId);
    } else {
      targetExists = await Asset.findById(targetId);
    }

    if (!targetExists) {
      return res.status(404).json({ message: `${targetType} not found` });
    }

    // Check if user already reviewed this target
    const alreadyReviewed = await Review.findOne({ user: req.user._id, targetId });
    if (alreadyReviewed) {
      // Update existing review
      alreadyReviewed.rating = Number(rating);
      alreadyReviewed.comment = comment;
      await alreadyReviewed.save();
      return res.json({ message: 'Review updated successfully', review: alreadyReviewed });
    }

    const review = await Review.create({
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

// @desc Get all reviews for a specific Course or Asset
// @route GET /api/reviews/:targetId
const getReviewsByTarget = async (req, res) => {
  try {
    const { targetId } = req.params;
    const reviews = await Review.find({ targetId }).populate('user', 'firstName lastName profileImage');
    
    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
      avgRating = (sum / reviews.length).toFixed(1);
    }

    res.json({
      count: reviews.length,
      averageRating: Number(avgRating),
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createReview, getReviewsByTarget };
