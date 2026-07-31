const Asset = require('../models/Asset');

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

// @desc Create asset (Admin)
// @route POST /api/assets
const createAsset = async (req, res) => {
  try {
    const { title, description, category, fileUrl, thumbnail, isFree, price } = req.body;
    const asset = new Asset({
      title,
      description,
      category,
      fileUrl,
      thumbnail,
      isFree,
      price
    });

    const createdAsset = await asset.save();
    res.status(201).json(createdAsset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAssets, getAssetById, createAsset };
