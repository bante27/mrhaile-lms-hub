const { z } = require('zod');

const statsQuerySchema = z.object({
    query: z.object({
        refresh: z.string().optional(),
    }),
});

module.exports = {
    statsQuerySchema,
};
