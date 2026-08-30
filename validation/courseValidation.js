const { z } = require('zod');

const createCourseSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Course title is required'),
        description: z.string().min(1, 'Course description is required'),
        price: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0, 'Price must be a positive number').optional()),
        instructor: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
    }),
});

const updateCourseSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        price: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0).optional()),
        instructor: z.string().optional(),
        category: z.string().optional(),
        thumbnail: z.string().optional(),
    }),
    params: z.object({
        id: z.string().min(1, 'Course ID is required'),
    }),
});

const courseIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Course ID is required'),
    }),
});

module.exports = {
    createCourseSchema,
    updateCourseSchema,
    courseIdSchema,
};
