const Asset = require('../../models/Asset');
const bunnyConfig = require('../../config/bunny');
const cloudinary = require('../../config/cloudinary');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class AssetBusinessService extends BaseService {
    constructor() {
        super(Asset);
    }

    async fetchAllAssets(queryParam) {
        const { category, search, isFree } = queryParam;
        let query = {};
        if (category) query.category = category;
        if (search) query.title = { $regex: search, $options: 'i' };
        if (isFree !== undefined) query.isFree = isFree === 'true';

        const page = Number(queryParam.page) || 1;
        const limit = Number(queryParam.limit) || 12;

        const { data: assets, source } = await super.getAll(query, 1800, `page-${page}-limit-${limit}-search-${search || ''}-cat-${category || ''}`);
        const total = await Asset.countDocuments(query);

        return {
            source,
            assets,
            page,
            pages: Math.ceil(total / limit),
            total
        };
    }

    async fetchAssetById(id) {
        const { data: asset, source } = await super.getById(id, 3600);
        if (!asset) {
            throw new AppError('Asset not found', 404);
        }
        return { source, ...asset.toObject ? asset.toObject() : asset };
    }

    async createNewAsset(body, files) {
        const { title, description, category, price, youtubeUrl, bunnyUrl, downloadUrl, isFree } = body;
        let fileUrl = body.fileUrl || downloadUrl || '';
        let pdfUrl = body.pdfUrl || '';
        let thumbnail = body.thumbnail || '';

        const isFreeParam = isFree !== undefined ? isFree : true;

        if (files && Array.isArray(files)) {
            const assetFile = files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile' || f.fieldname === 'video');
            if (assetFile && assetFile.buffer) {
                fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
            }

            const pdfFile = files.find(f => f.fieldname === 'pdf' || f.fieldname === 'pdfFile');
            if (pdfFile && pdfFile.buffer) {
                pdfUrl = await bunnyConfig.uploadAssetFile(pdfFile.originalname, pdfFile.buffer);
            }

            const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
            if (thumbnailFile && thumbnailFile.buffer) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'mrhaile_assets' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    uploadStream.end(thumbnailFile.buffer);
                });
                if (uploadResult && uploadResult.secure_url) {
                    thumbnail = uploadResult.secure_url;
                }
            }
        }

        const assetData = {
            title,
            description,
            category,
            fileUrl: fileUrl || downloadUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            downloadUrl: downloadUrl || fileUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            youtubeUrl: youtubeUrl || '',
            bunnyUrl: bunnyUrl || '',
            pdfUrl: pdfUrl || '',
            thumbnail: thumbnail || 'https://res.cloudinary.com/djx6uzc3k/image/upload/sample.jpg',
            isFree: isFreeParam === true || isFreeParam === 'true',
            price: Number(price) || 0
        };

        return await super.create(assetData);
    }

    async updateExistingAsset(id, body, files) {
        const { data: existing } = await super.getById(id, 3600);
        if (!existing) {
            throw new AppError('Asset not found', 404);
        }

        const { title, description, category, price, youtubeUrl, bunnyUrl, downloadUrl, fileUrl: bodyFileUrl, pdfUrl: bodyPdfUrl, thumbnail: bodyThumbnail, isFree } = body;
        const updateData = {};

        if (title) updateData.title = title;
        if (description) updateData.description = description;
        if (category) updateData.category = category;
        if (price !== undefined) updateData.price = Number(price);
        if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
        if (bunnyUrl !== undefined) updateData.bunnyUrl = bunnyUrl;
        if (downloadUrl) {
            updateData.downloadUrl = downloadUrl;
            updateData.fileUrl = downloadUrl;
        }
        if (bodyFileUrl) updateData.fileUrl = bodyFileUrl;
        if (bodyPdfUrl) updateData.pdfUrl = bodyPdfUrl;
        if (bodyThumbnail) updateData.thumbnail = bodyThumbnail;
        if (isFree !== undefined) updateData.isFree = isFree === true || isFree === 'true';

        if (files && Array.isArray(files)) {
            const assetFile = files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile' || f.fieldname === 'video');
            if (assetFile && assetFile.buffer) {
                const fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
                updateData.fileUrl = fileUrl;
                updateData.downloadUrl = fileUrl;
            }

            const pdfFile = files.find(f => f.fieldname === 'pdf' || f.fieldname === 'pdfFile');
            if (pdfFile && pdfFile.buffer) {
                const pdfUrl = await bunnyConfig.uploadAssetFile(pdfFile.originalname, pdfFile.buffer);
                updateData.pdfUrl = pdfUrl;
            }

            const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
            if (thumbnailFile && thumbnailFile.buffer) {
                const uploadResult = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        { folder: 'mrhaile_assets' },
                        (error, result) => {
                            if (error) return reject(error);
                            resolve(result);
                        }
                    );
                    uploadStream.end(thumbnailFile.buffer);
                });
                if (uploadResult && uploadResult.secure_url) {
                    updateData.thumbnail = uploadResult.secure_url;
                }
            }
        }

        return await super.update(id, updateData);
    }

    async removeAsset(id) {
        const asset = await super.delete(id);
        if (!asset) {
            throw new AppError('Asset not found', 404);
        }
        return asset;
    }
}

module.exports = new AssetBusinessService();
