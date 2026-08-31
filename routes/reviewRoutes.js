const express = require('express');
const router = express.Router();
const { createReview, getReviewsByTarget } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createReviewSchema, reviewTargetSchema } = require('../validation/reviewValidation');

router.route('/').post(protect, validate(createReviewSchema), createReview);
router.route('/:targetId').get(validate(reviewTargetSchema), getReviewsByTarget);

module.exports = router;
