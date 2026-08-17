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

router.route('/')
  .get(getPortfolioItems)
  .post(protect, admin, upload.any(), createPortfolioItem);

router.route('/:id')
  .get(getPortfolioById)
  .put(protect, admin, upload.any(), updatePortfolioItem)
  .delete(protect, admin, deletePortfolioItem);

module.exports = router;
