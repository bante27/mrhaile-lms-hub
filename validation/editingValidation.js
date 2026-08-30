const { z } = require('zod');

const createEditingPlanSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().min(1, 'Description is required'),
        price: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0, 'Price must be a positive number')),
        billingType: z.string().min(1, 'Billing type is required'),
        features: z.array(z.string()).optional(),
        image: z.string().optional(),
        isActive: z.boolean().optional(),
        isPopular: z.boolean().optional(),
    }),
});

const updateEditingPlanSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0).optional()),
        billingType: z.string().optional(),
        features: z.array(z.string()).optional(),
        image: z.string().optional(),
        isActive: z.boolean().optional(),
        isPopular: z.boolean().optional(),
    }),
    params: z.object({
        id: z.string().min(1, 'Plan ID is required'),
    }),
});

const createEditingOrderSchema = z.object({
    body: z.object({
        planId: z.string().min(1, 'Plan ID is required'),
        description: z.string().optional(),
        mock: z.boolean().optional(),
    }),
});

const planIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Plan ID is required'),
    }),
});

module.exports = {
    createEditingPlanSchema,
    updateEditingPlanSchema,
    createEditingOrderSchema,
    planIdSchema,
};
