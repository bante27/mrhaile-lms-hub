const Portfolio = require('../models/Portfolio');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// Helper to format portfolio with YouTube or Bunny video embed URL
const formatPortfolio = (item) => {
  const obj = item.toObject ? item.toObject() : item;
  if (obj.youtubeUrl && obj.youtubeUrl.trim() !== '') {
    obj.videoUrl = obj.youtubeUrl;
  } else if (obj.bunnyVideoId && obj.bunnyVideoId.trim() !== '') {
    obj.videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${obj.bunnyVideoId}`;
  }
  return obj;
};

// @desc Get all portfolio items with pagination (12 per page)
// @route GET /api/portfolio?page=1&limit=12&category=...
const getPortfolioItems = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const total = await Portfolio.countDocuments(query);
    const items = await Portfolio.find(query).skip(skip).limit(limit).sort({ createdAt: -1 });

    res.json({
      portfolioItems: items.map(formatPortfolio),
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single portfolio item by ID
// @route GET /api/portfolio/:id
const getPortfolioById = async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (item) {
      res.json(formatPortfolio(item));
    } else {
      res.status(404).json({ message: 'Portfolio item not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create portfolio item with optional video upload, YouTube URL & thumbnail (Admin)
// @route POST /api/portfolio
const createPortfolioItem = async (req, res) => {
  try {
    const { title, description, category, bunnyVideoId, youtubeUrl, client, completionDate } = req.body;
    let thumbnail = req.body.thumbnail || '';
    let finalBunnyId = bunnyVideoId || '';

    if (req.files && Array.isArray(req.files)) {
      // Handle thumbnail upload to Cloudinary
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
        } catch (err) {
          // ignore
        }
      }

      // Handle portfolio video file upload to Bunny Stream
      const videoFile = req.files.find(f => f.fieldname === 'video' || f.fieldname === 'portfolioVideo');
      if (videoFile && videoFile.buffer) {
        try {
          finalBunnyId = await bunnyConfig.uploadVideo(title, videoFile.buffer);
        } catch (err) {
          console.error('Portfolio video upload error:', err.message);
        }
      }
    }

    const portfolioItem = new Portfolio({
      title,
      description,
      category, // YouTube, Commercial, Music Video
      bunnyVideoId: finalBunnyId,
      youtubeUrl: youtubeUrl || '',
      thumbnail: thumbnail || 'https://res.cloudinary.com/djx6uzc3k/image/upload/sample.jpg',
      client: client || '',
      completionDate: completionDate || ''
    });

    const createdItem = await portfolioItem.save();
    res.status(201).json(formatPortfolio(createdItem));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update portfolio item by ID (Admin)
// @route PUT /api/portfolio/:id
const updatePortfolioItem = async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }

    const { title, description, category, bunnyVideoId, youtubeUrl, client, completionDate, thumbnail: bodyThumbnail } = req.body;

    if (title) item.title = title;
    if (description) item.description = description;
    if (category) item.category = category;
    if (bunnyVideoId !== undefined) item.bunnyVideoId = bunnyVideoId;
    if (youtubeUrl !== undefined) item.youtubeUrl = youtubeUrl;
    if (client !== undefined) item.client = client;
    if (completionDate !== undefined) item.completionDate = completionDate;
    if (bodyThumbnail) item.thumbnail = bodyThumbnail;

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
            item.thumbnail = uploadResult.secure_url;
          }
        } catch (err) {}
      }

      const videoFile = req.files.find(f => f.fieldname === 'video' || f.fieldname === 'portfolioVideo');
      if (videoFile && videoFile.buffer) {
        try {
          item.bunnyVideoId = await bunnyConfig.uploadVideo(item.title, videoFile.buffer);
        } catch (err) {}
      }
    }

    const updatedItem = await item.save();
    res.json(formatPortfolio(updatedItem));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete portfolio item by ID (Admin)
// @route DELETE /api/portfolio/:id
const deletePortfolioItem = async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Portfolio item not found' });
    }

    await item.deleteOne();
    res.json({ message: 'Portfolio item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPortfolioItems, getPortfolioById, createPortfolioItem, updatePortfolioItem, deletePortfolioItem };
