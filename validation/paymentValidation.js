const { z } = require('zod');

const initializePaymentSchema = z.object({
    body: z.object({
        courseId: z.string().min(1, 'Course ID is required'),
        amount: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0).optional()),
    }),
});

const verifyPaymentSchema = z.object({
    params: z.object({
        tx_ref: z.string().min(1, 'Transaction reference is required'),
    }),
});

const simulatePaymentSchema = z.object({
    body: z.object({
        tx_ref: z.string().optional(),
        courseId: z.string().optional(),
    }),
});

const testEmailSchema = z.object({
    body: z.object({
        email: z.string().email('Please provide a valid email address').optional(),
        courseTitle: z.string().optional(),
    }),
});

const updateTransactionStatusSchema = z.object({
    body: z.object({
        status: z.enum(['pending', 'completed', 'failed'], { errorMap: () => ({ message: 'Invalid status. Must be pending, completed, or failed' }) }),
    }),
    params: z.object({
        id: z.string().min(1, 'Transaction ID is required'),
    }),
});

module.exports = {
    initializePaymentSchema,
    verifyPaymentSchema,
    simulatePaymentSchema,
    testEmailSchema,
    updateTransactionStatusSchema,
};
