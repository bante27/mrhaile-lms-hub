const Portfolio = require('../models/Portfolio');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');
const BaseService = require('../services/BaseService');

const portfolioService = new BaseService(Portfolio);

const formatPortfolio = (item) => {
  const obj = item.toObject ? item.toObject() : item;
  if (obj.youtubeUrl && obj.youtubeUrl.trim() !== '') {
    obj.videoUrl = obj.youtubeUrl;
  } else if (obj.bunnyVideoId && obj.bunnyVideoId.trim() !== '') {
    obj.videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${obj.bunnyVideoId}`;
  }
  return obj;
};

const getPortfolioItems = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;

    const { data: items, source } = await portfolioService.getAll(query, 1800, `page-${page}-limit-${limit}-cat-${category || ''}`);
    const total = await Portfolio.countDocuments(query);

    res.json({
      source,
      portfolioItems: items.map(formatPortfolio),
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPortfolioById = async (req, res) => {
  try {
    const { data: item, source } = await portfolioService.getById(req.params.id, 3600);
    if (item) {
      res.json({ source, ...formatPortfolio(item) });
    } else {
      res.status(404).json({ message: 'Portfolio item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPortfolioItem = async (req, res) => {
  try {
    const { title, description, category, bunnyVideoId, youtubeUrl, client, completionDate } = req.body;
    let thumbnail = req.body.thumbnail || '';
    let finalBunnyId = bunnyVideoId || '';

    if (req.files && Array.isArray(req.files)) {
      const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
      if (thumbnailFile && thumbnailFile.buffer) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: 'mrhaile_portfolio' },
              (error, result) => (error ? reject(error) : resolve(result))
            );
            uploadStream.end(thumbnailFile.buffer);
          });
          if (uploadResult && uploadResult.secure_url) {
            thumbnail = uploadResult.secure_url;
          }
        } catch (err) { }
      }

      const videoFile = req.files.find(f => f.fieldname === 'video' || f.fieldname === 'portfolioVideo');
      if (videoFile && videoFile.buffer) {
        try {
          finalBunnyId = await bunnyConfig.uploadVideo(title, videoFile.buffer);
        } catch (err) { }
      }
    }

    const itemData = {
      title,
      description,
      category,
      bunnyVideoId: finalBunnyId,
      youtubeUrl: youtubeUrl || '',
      thumbnail: thumbnail || 'https://res.cloudinary.com/djx6uzc3k/image/upload/sample.jpg',
      client: client || '',
      completionDate: completionDate || ''
    };

    const createdItem = await portfolioService.create(itemData);
    res.status(201).json(formatPortfolio(createdItem));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePortfolioItem = async (req, res) => {
  try {
    const { data: existing } = await portfolioService.getById(req.params.id, 3600);
    if (!existing) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }

    const { title, description, category, bunnyVideoId, youtubeUrl, client, completionDate, thumbnail: bodyThumbnail } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (bunnyVideoId !== undefined) updateData.bunnyVideoId = bunnyVideoId;
    if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
    if (client !== undefined) updateData.client = client;
    if (completionDate !== undefined) updateData.completionDate = completionDate;
    if (bodyThumbnail) updateData.thumbnail = bodyThumbnail;

    if (req.files && Array.isArray(req.files)) {
      const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
      if (thumbnailFile && thumbnailFile.buffer) {
        try {
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: 'mrhaile_portfolio' },
              (error, result) => (error ? reject(error) : resolve(result))
            );
            uploadStream.end(thumbnailFile.buffer);
          });
          if (uploadResult && uploadResult.secure_url) {
            updateData.thumbnail = uploadResult.secure_url;
          }
        } catch (err) { }
      }

      const videoFile = req.files.find(f => f.fieldname === 'video' || f.fieldname === 'portfolioVideo');
      if (videoFile && videoFile.buffer) {
        try {
          updateData.bunnyVideoId = await bunnyConfig.uploadVideo(title || existing.title, videoFile.buffer);
        } catch (err) { }
      }
    }

    const updatedItem = await portfolioService.update(req.params.id, updateData);
    res.json(formatPortfolio(updatedItem));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePortfolioItem = async (req, res) => {
  try {
    const item = await portfolioService.delete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }
    res.json({ message: 'Portfolio item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPortfolioItems, getPortfolioById, createPortfolioItem, updatePortfolioItem, deletePortfolioItem };
