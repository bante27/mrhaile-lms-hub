const { z } = require('zod');

const createReviewSchema = z.object({
    body: z.object({
        targetId: z.string().min(1, 'Target ID is required'),
        targetType: z.enum(['Course', 'Asset'], { errorMap: () => ({ message: 'Invalid targetType. Must be Course or Asset' }) }),
        rating: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5')),
        comment: z.string().min(1, 'Comment is required'),
    }),
});

const reviewTargetSchema = z.object({
    params: z.object({
        targetId: z.string().min(1, 'Target ID is required'),
    }),
});

module.exports = {
    createReviewSchema,
    reviewTargetSchema,
};
