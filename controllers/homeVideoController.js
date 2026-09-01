const homeVideoBusinessService = require('../services/business/homeVideoBusinessService');
const catchAsync = require('../utils/catchAsync');

const getHomeVideo = catchAsync(async (req, res, next) => {
  const result = await homeVideoBusinessService.fetchHomeVideo();
  res.json(result);
});

const createHomeVideo = catchAsync(async (req, res, next) => {
  const result = await homeVideoBusinessService.createNewHomeVideo(req);
  res.status(201).json(result);
});

const updateHomeVideo = catchAsync(async (req, res, next) => {
  const result = await homeVideoBusinessService.updateExistingHomeVideo(req);
  res.json(result);
});

module.exports = { getHomeVideo, createHomeVideo, updateHomeVideo };
