const assetBusinessService = require('../services/business/assetBusinessService');
const catchAsync = require('../utils/catchAsync');

const getAssets = catchAsync(async (req, res, next) => {
  const result = await assetBusinessService.fetchAllAssets(req.query);
  res.json(result);
});

const getAssetById = catchAsync(async (req, res, next) => {
  const result = await assetBusinessService.fetchAssetById(req.params.id);
  res.json(result);
});

const createAsset = catchAsync(async (req, res, next) => {
  const createdAsset = await assetBusinessService.createNewAsset(req.body, req.files);
  res.status(201).json(createdAsset);
});

const updateAsset = catchAsync(async (req, res, next) => {
  const updatedAsset = await assetBusinessService.updateExistingAsset(req.params.id, req.body, req.files);
  res.json(updatedAsset);
});

const deleteAsset = catchAsync(async (req, res, next) => {
  await assetBusinessService.removeAsset(req.params.id);
  res.json({ message: 'Asset removed successfully' });
});

module.exports = { getAssets, getAssetById, createAsset, updateAsset, deleteAsset };
