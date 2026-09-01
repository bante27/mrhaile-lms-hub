const User = require('../../models/User');
const Course = require('../../models/Course');
const Asset = require('../../models/Asset');
const Review = require('../../models/Review');
const BaseService = require('../../services/BaseService');

class StatsBusinessService {
    constructor() {
        this.userService = new BaseService(User);
        this.courseService = new BaseService(Course);
        this.assetService = new BaseService(Asset);
        this.reviewService = new BaseService(Review);
    }

    async fetchPlatformStats() {
        const cacheKey = 'stats:platform';
        const cachedStats = await this.userService.cache.get ? await this.userService.cache.get(cacheKey) : null;
        const cache = require('../../utils/fallbackCache');
        const directCached = await cache.get(cacheKey);

        if (directCached) {
            return { source: 'cache', ...directCached };
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

        return { source: 'database', ...stats };
    }
}

module.exports = new StatsBusinessService();
