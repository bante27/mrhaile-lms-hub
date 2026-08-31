const User = require('../models/User');
const Course = require('../models/Course');
const Asset = require('../models/Asset');
const Review = require('../models/Review');
const cache = require('../utils/fallbackCache');
const catchAsync = require('../utils/catchAsync');

const getPlatformStats = catchAsync(async (req, res, next) => {
  const cacheKey = 'stats:platform';
  const cachedStats = await cache.get(cacheKey);

  if (cachedStats) {
    return res.json({ source: 'cache', ...cachedStats });
  }

  const totalStudents = await User.countDocuments();
  const totalCourses = await Course.countDocuments();
  const totalAssets = await Asset.countDocuments();
  const totalReviews = await Review.countDocuments();

  const stats = {
    activeStudents: totalStudents,
    masterclasses: totalCourses,
    digitalAssets: totalAssets,
    totalReviews,
    successRate: '99.4%'
  };

  await cache.set(cacheKey, stats, 1800);

  res.json({ source: 'database', ...stats });
});

module.exports = { getPlatformStats };
