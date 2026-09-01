const Review = require('../../models/Review');
const Course = require('../../models/Course');
const Asset = require('../../models/Asset');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class ReviewBusinessService {
    constructor() {
        this.reviewService = new BaseService(Review);
        this.courseService = new BaseService(Course);
        this.assetService = new BaseService(Asset);
    }

    async createOrUpdateReview(body, user) {
        const { targetId, targetType, rating, comment } = body;

        if (targetType !== 'Course' && targetType !== 'Asset') {
            throw new AppError('Invalid targetType. Must be Course or Asset', 400);
        }

        let targetExists = null;
        if (targetType === 'Course') {
            const { data: course } = await this.courseService.getById(targetId, 3600);
            targetExists = course;
        } else {
            const { data: asset } = await this.assetService.getById(targetId, 3600);
            targetExists = asset;
        }

        if (!targetExists) {
            throw new AppError(`${targetType} not found`, 404);
        }

        const alreadyReviewed = await Review.findOne({ user: user._id, targetId });
        if (alreadyReviewed) {
            alreadyReviewed.rating = Number(rating);
            alreadyReviewed.comment = comment;
            await alreadyReviewed.save();
            await this.reviewService.invalidatePattern(`review:*`);
            return { message: 'Review updated successfully', review: alreadyReviewed, status: 200 };
        }

        const review = await this.reviewService.create({
            user: user._id,
            targetId,
            targetType,
            rating: Number(rating),
            comment
        });

        return { message: 'Review added successfully', review, status: 201 };
    }

    async fetchReviewsByTarget(targetId) {
        const { data: reviews, source } = await this.reviewService.getAll({ targetId }, 1800, `target-${targetId}`);

        const populatedReviews = await Review.populate(reviews, { path: 'user', select: 'firstName lastName profileImage' });

        let avgRating = 0;
        if (populatedReviews.length > 0) {
            const sum = populatedReviews.reduce((acc, item) => acc + item.rating, 0);
            avgRating = (sum / populatedReviews.length).toFixed(1);
        }

        return {
            source,
            count: populatedReviews.length,
            averageRating: Number(avgRating),
            reviews: populatedReviews
        };
    }
}

module.exports = new ReviewBusinessService();
