const statsBusinessService = require('../services/business/statsBusinessService');
const catchAsync = require('../utils/catchAsync');

const getPlatformStats = catchAsync(async (req, res, next) => {
  const result = await statsBusinessService.fetchPlatformStats();
  res.json(result);
});

module.exports = { getPlatformStats };
