const Asset = require('../models/Asset');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// @desc Get all digital assets & stock footage
// @route GET /api/assets
const getAssets = async (req, res) => {
  try {
    const { category, search, isFree } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };
    if (isFree !== undefined) query.isFree = isFree === 'true';

    const assets = await Asset.find(query);
    res.json(assets);
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

// @desc Create asset with YouTube, Bunny.net, PDF, download URL, file upload & Cloudinary thumbnail (Admin)
// @route POST /api/assets
const createAsset = async (req, res) => {
  try {
    const { title, description, category, price, youtubeUrl, bunnyUrl, pdfUrl, downloadUrl, isFree } = req.body;
    let fileUrl = req.body.fileUrl || downloadUrl || '';
    let thumbnail = req.body.thumbnail || '';
    
    const isFreeParam = isFree !== undefined ? isFree : true;

    if (req.files && Array.isArray(req.files)) {
      const assetFile = req.files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile' || f.fieldname === 'video');
      if (assetFile && assetFile.buffer) {
        fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
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
      fileUrl: fileUrl || downloadUrl || 'https://mrhaile.b-cdn.net/sample-asset.zip',
      downloadUrl: downloadUrl || fileUrl || '',
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

module.exports = { getAssets, getAssetById, createAsset };
