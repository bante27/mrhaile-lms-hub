const express = require('express');
const router = express.Router();
const {
  getPortfolioItems,
  getPortfolioById,
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem
} = require('../controllers/portfolioController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  createPortfolioSchema,
  updatePortfolioSchema,
  portfolioIdSchema,
} = require('../validation/portfolioValidation');

router.route('/')
  .get(getPortfolioItems)
  .post(protect, admin, upload.any(), validate(createPortfolioSchema), createPortfolioItem);

router.route('/:id')
  .get(validate(portfolioIdSchema), getPortfolioById)
  .put(protect, admin, upload.any(), validate(updatePortfolioSchema), updatePortfolioItem)
  .delete(protect, admin, validate(portfolioIdSchema), deletePortfolioItem);

module.exports = router;
