const portfolioBusinessService = require('../services/business/portfolioBusinessService');
const catchAsync = require('../utils/catchAsync');

const getPortfolioItems = catchAsync(async (req, res, next) => {
  const result = await portfolioBusinessService.fetchAllPortfolios(req.query);
  res.json(result);
});

const getPortfolioById = catchAsync(async (req, res, next) => {
  const result = await portfolioBusinessService.fetchPortfolioById(req.params.id);
  res.json(result);
});

const createPortfolioItem = catchAsync(async (req, res, next) => {
  const result = await portfolioBusinessService.createNewPortfolio(req.body, req.files);
  res.status(201).json(result);
});

const updatePortfolioItem = catchAsync(async (req, res, next) => {
  const result = await portfolioBusinessService.updateExistingPortfolio(req.params.id, req.body, req.files);
  res.json(result);
});

const deletePortfolioItem = catchAsync(async (req, res, next) => {
  await portfolioBusinessService.removePortfolio(req.params.id);
  res.json({ message: 'Portfolio item removed successfully' });
});

module.exports = { getPortfolioItems, getPortfolioById, createPortfolioItem, updatePortfolioItem, deletePortfolioItem };
