const { z } = require('zod');

const sendMessageSchema = z.object({
    body: z.object({
        text: z.string().min(1, 'Message text is required'),
    }),
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
    }),
});

const conversationIdSchema = z.object({
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
    }),
});

const updateStatusSchema = z.object({
    body: z.object({
        status: z.enum(['active', 'closed', 'pending'], { message: 'Invalid status specified' }),
    }),
    params: z.object({
        conversationId: z.string().min(1, 'Conversation ID is required'),
    }),
});

module.exports = {
    sendMessageSchema,
    conversationIdSchema,
    updateStatusSchema,
};
