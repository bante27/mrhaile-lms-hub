const mongoose = require('mongoose');

const serviceInquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  serviceType: { type: String, required: true }, // YouTube Video Editing, Commercial, Color Grading, etc.
  budget: { type: String }, // Estimated Budget (e.g., $300 - $600)
  message: { type: String, required: true }, // Project Details & Footage Link
  status: { type: String, enum: ['pending', 'contacted', 'completed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('ServiceInquiry', serviceInquirySchema);
