const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  bunnyVideoId: { type: String, default: '' }, // Bunny Stream Video ID
  duration: { type: String },
  freePreview: { type: Boolean, default: false }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, default: 0 },
  instructor: { type: String, required: true },
  thumbnail: { type: String },
  category: { type: String, required: true },
  lessons: [lessonSchema]
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
