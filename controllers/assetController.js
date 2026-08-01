const Asset = require('../models/Asset');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// @desc Get all digital assets & stock footage
// @route GET /api/assets
const getAssets = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (search) query.title = { $regex: search, $options: 'i' };

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

// @desc Create asset with Bunny Storage file upload & Cloudinary thumbnail (Admin)
// @route POST /api/assets
const createAsset = async (req, res) => {
  try {
    const { title, description, category, isFree, price } = req.body;
    let fileUrl = req.body.fileUrl || '';
    let thumbnail = req.body.thumbnail || '';

    if (req.files && Array.isArray(req.files)) {
      // Handle digital asset file upload to Bunny Storage
      const assetFile = req.files.find(f => f.fieldname === 'file' || f.fieldname === 'assetFile');
      if (assetFile && assetFile.buffer) {
        fileUrl = await bunnyConfig.uploadAssetFile(assetFile.originalname, assetFile.buffer);
      }

      // Handle thumbnail image upload to Cloudinary
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
        } catch (err) {
          // Ignore or fallback
        }
      }
    }

    const asset = new Asset({
      title,
      description,
      category,
      fileUrl,
      thumbnail,
      isFree: isFree === true || isFree === 'true',
      price: Number(price) || 0
    });

    const createdAsset = await asset.save();
    res.status(201).json(createdAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssets, getAssetById, createAsset };
