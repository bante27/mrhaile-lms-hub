const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // YouTube, Commercial, Music Video
  bunnyVideoId: { type: String, default: '' }, // Bunny Stream Video ID for portfolio showcase
  youtubeUrl: { type: String, default: '' }, // YouTube Embed/Video URL
  videoUrl: { type: String }, // Direct playable embed URL
  thumbnail: { type: String }, // Cloudinary thumbnail
  client: { type: String },
  completionDate: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
