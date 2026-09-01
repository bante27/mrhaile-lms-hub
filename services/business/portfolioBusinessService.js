const Portfolio = require('../../models/Portfolio');
const bunnyConfig = require('../../config/bunny');
const cloudinary = require('../../config/cloudinary');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class PortfolioBusinessService extends BaseService {
    constructor() {
        super(Portfolio);
    }

    formatPortfolio(item) {
        const obj = item.toObject ? item.toObject() : item;
        if (obj.youtubeUrl && obj.youtubeUrl.trim() !== '') {
            obj.videoUrl = obj.youtubeUrl;
        } else if (obj.bunnyVideoId && obj.bunnyVideoId.trim() !== '') {
            obj.videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${obj.bunnyVideoId}`;
        }
        return obj;
    }

    async fetchAllPortfolios(queryParam) {
        const { category } = queryParam;
        let query = {};
        if (category) query.category = category;

        const page = Number(queryParam.page) || 1;
        const limit = Number(queryParam.limit) || 12;

        const { data: items, source } = await super.getAll(query, 1800, `page-${page}-limit-${limit}-cat-${category || ''}`);
        const total = await Portfolio.countDocuments(query);

        return {
            source,
            portfolioItems: items.map(item => this.formatPortfolio(item)),
            page,
            pages: Math.ceil(total / limit),
            total
        };
    }

    async fetchPortfolioById(id) {
        const { data: item, source } = await super.getById(id, 3600);
        if (!item) {
            throw new AppError('Portfolio item not found', 404);
        }
        return { source, ...this.formatPortfolio(item) };
    }

    async createNewPortfolio(body, files) {
        const { title, description, category, bunnyVideoId, youtubeUrl, client, completionDate } = body;
        let thumbnail = body.thumbnail || '';
        let finalBunnyId = bunnyVideoId || '';

        if (files && Array.isArray(files)) {
            const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
            if (thumbnailFile && thumbnailFile.buffer) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'mrhaile_portfolio' },
                        (error, result) => (error ? reject(error) : resolve(result))
                    );
                    uploadStream.end(thumbnailFile.buffer);
                });
                if (uploadResult && uploadResult.secure_url) {
                    thumbnail = uploadResult.secure_url;
                }
            }

            const videoFile = files.find(f => f.fieldname === 'video' || f.fieldname === 'portfolioVideo');
            if (videoFile && videoFile.buffer) {
                finalBunnyId = await bunnyConfig.uploadVideo(title, videoFile.buffer);
            }
        }

        const itemData = {
            title,
            description,
            category,
            bunnyVideoId: finalBunnyId,
            youtubeUrl: youtubeUrl || '',
            thumbnail: thumbnail || 'https://res.cloudinary.com/djx6uzc3k/image/upload/sample.jpg',
            client: client || '',
            completionDate: completionDate || ''
        };

        const createdItem = await super.create(itemData);
        return this.formatPortfolio(createdItem);
    }

    async updateExistingPortfolio(id, body, files) {
        const { data: existing } = await super.getById(id, 3600);
        if (!existing) {
            throw new AppError('Portfolio item not found', 404);
        }

        const { title, description, category, bunnyVideoId, youtubeUrl, client, completionDate, thumbnail: bodyThumbnail } = body;
        const updateData = {};

        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (category) updateData.category = category;
        if (bunnyVideoId !== undefined) updateData.bunnyVideoId = bunnyVideoId;
        if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
        if (client !== undefined) updateData.client = client;
        if (completionDate !== undefined) updateData.completionDate = completionDate;
        if (bodyThumbnail) updateData.thumbnail = bodyThumbnail;

        if (files && Array.isArray(files)) {
            const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
            if (thumbnailFile && thumbnailFile.buffer) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'mrhaile_portfolio' },
                        (error, result) => (error ? reject(error) : resolve(result))
                    );
                    uploadStream.end(thumbnailFile.buffer);
                });
                if (uploadResult && uploadResult.secure_url) {
                    updateData.thumbnail = uploadResult.secure_url;
                }
            }

            const videoFile = files.find(f => f.fieldname === 'video' || f.fieldname === 'portfolioVideo');
            if (videoFile && videoFile.buffer) {
                updateData.bunnyVideoId = await bunnyConfig.uploadVideo(title || existing.title, videoFile.buffer);
            }
        }

        const updatedItem = await super.update(id, updateData);
        return this.formatPortfolio(updatedItem);
    }

    async removePortfolio(id) {
        const item = await super.delete(id);
        if (!item) {
            throw new AppError('Portfolio item not found', 404);
        }
        return item;
    }
}

module.exports = new PortfolioBusinessService();
