const express = require('express');
const router = express.Router();
const { getAssets, getAssetById, createAsset } = require('../controllers/assetController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getAssets).post(protect, admin, createAsset);
router.route('/:id').get(getAssetById);

module.exports = router;
