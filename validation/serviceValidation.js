const { z } = require('zod');

const submitInquirySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Please provide a valid email address'),
        phone: z.string().optional(),
        serviceType: z.string().min(1, 'Service type is required'),
        budget: z.string().optional(),
        message: z.string().min(1, 'Project details / message is required'),
    }),
});

const replyInquirySchema = z.object({
    body: z.object({
        replyMessage: z.string().min(1, 'Reply message is required'),
        status: z.string().optional(),
    }),
    params: z.object({
        id: z.string().min(1, 'Inquiry ID is required'),
    }),
});

const inquiryIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Inquiry ID is required'),
    }),
});

module.exports = {
    submitInquirySchema,
    replyInquirySchema,
    inquiryIdSchema,
};
