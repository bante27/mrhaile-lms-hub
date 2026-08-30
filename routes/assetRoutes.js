const express = require('express');
const router = express.Router();
const { getAssets, getAssetById, createAsset, updateAsset, deleteAsset } = require('../controllers/assetController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createAssetSchema, updateAssetSchema, assetIdSchema } = require('../validation/assetValidation');

router.route('/')
  .get(getAssets)
  .post(protect, admin, upload.any(), validate(createAssetSchema), createAsset);

router.route('/:id')
  .get(validate(assetIdSchema), getAssetById)
  .put(protect, admin, upload.any(), validate(updateAssetSchema), updateAsset)
  .delete(protect, admin, validate(assetIdSchema), deleteAsset);

module.exports = router;

