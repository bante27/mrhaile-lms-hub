const { z } = require('zod');

const subscribeNewsletterSchema = z.object({
    body: z.object({
        email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
    }),
});

const broadcastNewsletterSchema = z.object({
    body: z.object({
        subject: z.string().min(1, 'Subject is required'),
        message: z.string().min(1, 'Message is required'),
    }),
});

module.exports = {
    subscribeNewsletterSchema,
    broadcastNewsletterSchema,
};
