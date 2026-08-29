const Asset = require('../models/Asset');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');
const BaseService = require('../services/BaseService');

const assetService = new BaseService(Asset);

const getAssets = async (req, res) => {
  try {
    const { category, search, isFree } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (isFree !== undefined) query.isFree = isFree === 'true';

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;

    const { data: assets, source } = await assetService.getAll(query, 1800, `page-${page}-limit-${limit}-search-${search || ''}-cat-${category || ''}`);
    const total = await Asset.countDocuments(query);

    res.json({
      source,
      assets,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAssetById = async (req, res) => {
  try {
    const { data: asset, source } = await assetService.getById(req.params.id, 3600);
    if (asset) {
      res.json({ source, ...asset.toObject ? asset.toObject() : asset });
    } else {
      res.status(404).json({ message: 'Asset not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createAsset = async (req, res) => {
  try {
    const { title, description, category, price, youtubeUrl, bunnyUrl, downloadUrl, isFree } = req.body;
    let fileUrl = req.body.fileUrl || downloadUrl || '';
    let pdfUrl = req.body.pdfUrl || '';
    let thumbnail = req.body.thumbnail || '';
    
    const isFreeParam = isFree !== undefined ? isFree : true;

    if (req.files && Array.isArray(req.files)) {
      const assetFile = req.files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile' || f.fieldname === 'video');
      if (assetFile && assetFile.buffer) {
        fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
      }

      const pdfFile = req.files.find(f => f.fieldname === 'pdf' || f.fieldname === 'pdfFile');
      if (pdfFile && pdfFile.buffer) {
        pdfUrl = await bunnyConfig.uploadAssetFile(pdfFile.originalname, pdfFile.buffer);
      }

      const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
      if (thumbnailFile && thumbnailFile.buffer) {
        try {
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
        } catch (err) {}
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

    const createdAsset = await assetService.create(assetData);
    res.status(201).json(createdAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAsset = async (req, res) => {
  try {
    const { data: existing } = await assetService.getById(req.params.id, 3600);
    if (!existing) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const { title, description, category, price, youtubeUrl, bunnyUrl, downloadUrl, fileUrl: bodyFileUrl, pdfUrl: bodyPdfUrl, thumbnail: bodyThumbnail, isFree } = req.body;
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

    if (req.files && Array.isArray(req.files)) {
      const assetFile = req.files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile' || f.fieldname === 'video');
      if (assetFile && assetFile.buffer) {
        const fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
        updateData.fileUrl = fileUrl;
        updateData.downloadUrl = fileUrl;
      }

      const pdfFile = req.files.find(f => f.fieldname === 'pdf' || f.fieldname === 'pdfFile');
      if (pdfFile && pdfFile.buffer) {
        const pdfUrl = await bunnyConfig.uploadAssetFile(pdfFile.originalname, pdfFile.buffer);
        updateData.pdfUrl = pdfUrl;
      }

      const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
      if (thumbnailFile && thumbnailFile.buffer) {
        try {
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
        } catch (err) {}
      }
    }

    const updatedAsset = await assetService.update(req.params.id, updateData);
    res.json(updatedAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await assetService.delete(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }
    res.json({ message: 'Asset removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssets, getAssetById, createAsset, updateAsset, deleteAsset };
