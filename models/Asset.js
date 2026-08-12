const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // Stock Footage, Audio, SFX, Background Music, Presets, Overlays, Templates
  fileUrl: { type: String },
  downloadUrl: { type: String },
  youtubeUrl: { type: String },
  bunnyUrl: { type: String },
  pdfUrl: { type: String },
  thumbnail: { type: String },
  isFree: { type: Boolean, default: true },
  price: { type: Number, default: 0 },
  downloadsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
