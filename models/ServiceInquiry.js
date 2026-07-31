const mongoose = require('mongoose');

const serviceInquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  serviceType: { type: String, required: true }, // Video Editing, Motion Graphics, etc.
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'contacted', 'completed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('ServiceInquiry', serviceInquirySchema);
