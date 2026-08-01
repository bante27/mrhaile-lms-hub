const express = require('express');
const router = express.Router();
const { getAssets, getAssetById, createAsset } = require('../controllers/assetController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getAssets)
  .post(protect, admin, upload.any(), createAsset);

router.route('/:id').get(getAssetById);

module.exports = router;
