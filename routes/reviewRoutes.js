const express = require('express');
const router = express.Router();
const { createReview, getReviewsByTarget } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').post(protect, createReview);
router.route('/:targetId').get(getReviewsByTarget);

module.exports = router;
