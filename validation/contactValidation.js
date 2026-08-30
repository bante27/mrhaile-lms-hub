const { z } = require('zod');

const contactSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Please provide a valid email address'),
        phone: z.string().optional(),
        subject: z.string().optional(),
        message: z.string().min(1, 'Message is required'),
    }),
});

module.exports = {
    contactSchema,
};
