const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // Premiere Pro, After Effects, Vectors, SFX
  fileUrl: { type: String, required: true },
  thumbnail: { type: String },
  isFree: { type: Boolean, default: true },
  price: { type: Number, default: 0 },
  downloadsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
