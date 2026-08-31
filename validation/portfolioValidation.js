const { z } = require('zod');

const createPortfolioSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Portfolio title is required'),
        description: z.string().min(1, 'Portfolio description is required'),
        category: z.string().min(1, 'Category is required'),
        bunnyVideoId: z.string().optional(),
        youtubeUrl: z.string().optional(),
        client: z.string().optional(),
        completionDate: z.string().optional(),
        thumbnail: z.string().optional(),
    }),
});

const updatePortfolioSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        bunnyVideoId: z.string().optional(),
        youtubeUrl: z.string().optional(),
        client: z.string().optional(),
        completionDate: z.string().optional(),
        thumbnail: z.string().optional(),
    }),
    params: z.object({
        id: z.string().min(1, 'Portfolio ID is required'),
    }),
});

const portfolioIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Portfolio ID is required'),
    }),
});

module.exports = {
    createPortfolioSchema,
    updatePortfolioSchema,
    portfolioIdSchema,
};
