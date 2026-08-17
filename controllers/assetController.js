const Asset = require('../models/Asset');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// @desc Get all digital assets & stock footage with pagination (12 per page)
// @route GET /api/assets?page=1&limit=12&category=...&search=...&isFree=...
const getAssets = async (req, res) => {
  try {
    const { category, search, isFree } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (isFree !== undefined) query.isFree = isFree === 'true';

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const total = await Asset.countDocuments(query);
    const assets = await Asset.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });

    res.json({
      assets,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get asset by ID
// @route GET /api/assets/:id
const getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (asset) {
      res.json(asset);
    } else {
      res.status(404).json({ message: 'Asset not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create asset with YouTube, Bunny.net, PDF file upload, download URL & Cloudinary thumbnail (Admin)
// @route POST /api/assets
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

    const asset = new Asset({
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
    });

    const createdAsset = await asset.save();
    res.status(201).json(createdAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update asset by ID (Admin)
// @route PUT /api/assets/:id
const updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    const { title, description, category, price, youtubeUrl, bunnyUrl, downloadUrl, fileUrl: bodyFileUrl, pdfUrl: bodyPdfUrl, thumbnail: bodyThumbnail, isFree } = req.body;

    if (title) asset.title = title;
    if (description) asset.description = description;
    if (category) asset.category = category;
    if (price !== undefined) asset.price = Number(price);
    if (youtubeUrl !== undefined) asset.youtubeUrl = youtubeUrl;
    if (bunnyUrl !== undefined) asset.bunnyUrl = bunnyUrl;
    if (downloadUrl) {
      asset.downloadUrl = downloadUrl;
      asset.fileUrl = downloadUrl;
    }
    if (bodyFileUrl) asset.fileUrl = bodyFileUrl;
    if (bodyPdfUrl) asset.pdfUrl = bodyPdfUrl;
    if (bodyThumbnail) asset.thumbnail = bodyThumbnail;
    if (isFree !== undefined) asset.isFree = isFree === true || isFree === 'true';

    if (req.files && Array.isArray(req.files)) {
      const assetFile = req.files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile' || f.fieldname === 'video');
      if (assetFile && assetFile.buffer) {
        const fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
        asset.fileUrl = fileUrl;
        asset.downloadUrl = fileUrl;
      }

      const pdfFile = req.files.find(f => f.fieldname === 'pdf' || f.fieldname === 'pdfFile');
      if (pdfFile && pdfFile.buffer) {
        const pdfUrl = await bunnyConfig.uploadAssetFile(pdfFile.originalname, pdfFile.buffer);
        asset.pdfUrl = pdfUrl;
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
            asset.thumbnail = uploadResult.secure_url;
          }
        } catch (err) {}
      }
    }

    const updatedAsset = await asset.save();
    res.json(updatedAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete asset by ID (Admin)
// @route DELETE /api/assets/:id
const deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: 'Asset not found' });
    }

    await asset.deleteOne();
    res.json({ message: 'Asset removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssets, getAssetById, createAsset, updateAsset, deleteAsset };
