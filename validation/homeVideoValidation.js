const { z } = require('zod');

const homeVideoSchema = z.object({
    body: z.object({
        bunnyVideoId: z.string().optional(),
        youtubeUrl: z.string().optional(),
        youtubeUrl2: z.string().optional(),
        thumbnail: z.string().optional(),
    }),
});

module.exports = {
    homeVideoSchema,
};
