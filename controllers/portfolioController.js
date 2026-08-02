const Portfolio = require('../models/Portfolio');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// Helper to format portfolio with video embed URL
const formatPortfolio = (item) => {
  const obj = item.toObject ? item.toObject() : item;
  if (obj.bunnyVideoId && obj.bunnyVideoId.trim() !== '') {
    obj.videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${obj.bunnyVideoId}`;
  }
  return obj;
};

// @desc Get all portfolio items (with optional category filter)
// @route GET /api/portfolio
const getPortfolioItems = async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category) query.category = category;

    const items = await Portfolio.find(query);
    res.json(items.map(formatPortfolio));
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

// @desc Create portfolio item with optional video upload & thumbnail (Admin)
// @route POST /api/portfolio
const createPortfolioItem = async (req, res) => {
  try {
    const { title, description, category, bunnyVideoId, client, completionDate } = req.body;
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

module.exports = { getPortfolioItems, getPortfolioById, createPortfolioItem };
