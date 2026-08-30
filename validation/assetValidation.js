const { z } = require('zod');

const createAssetSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().min(1, 'Description is required'),
        category: z.string().min(1, 'Category is required'),
        price: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0, 'Price must be a positive number').optional()),
        youtubeUrl: z.string().optional(),
        bunnyUrl: z.string().optional(),
        downloadUrl: z.string().optional(),
        fileUrl: z.string().optional(),
        pdfUrl: z.string().optional(),
        thumbnail: z.string().optional(),
        isFree: z.preprocess((val) => (val === 'true' || val === true ? true : val === 'false' || val === false ? false : undefined), z.boolean().optional()),
    }),
});

const updateAssetSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        price: z.preprocess((val) => (val !== undefined ? Number(val) : undefined), z.number().min(0).optional()),
        youtubeUrl: z.string().optional(),
        bunnyUrl: z.string().optional(),
        downloadUrl: z.string().optional(),
        fileUrl: z.string().optional(),
        pdfUrl: z.string().optional(),
        thumbnail: z.string().optional(),
        isFree: z.preprocess((val) => (val === 'true' || val === true ? true : val === 'false' || val === false ? false : undefined), z.boolean().optional()),
    }),
    params: z.object({
        id: z.string().min(1, 'Asset ID is required'),
    }),
});

const assetIdSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Asset ID is required'),
    }),
});

module.exports = {
    createAssetSchema,
    updateAssetSchema,
    assetIdSchema,
};
