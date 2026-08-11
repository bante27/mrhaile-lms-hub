const mongoose = require('mongoose');

const homeVideoSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  bunnyVideoId: { type: String, default: '' },
  videoUrl: { type: String },
  thumbnail: { type: String },
  buttonText: { type: String, default: '' },
  buttonLink: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('HomeVideo', homeVideoSchema);
