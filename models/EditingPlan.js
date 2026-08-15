const mongoose = require('mongoose');

const editingPlanSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  billingType: { type: String, required: true }, // e.g. "per video", "per project", "per month"
  features: [{ type: String }],
  image: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('EditingPlan', editingPlanSchema);
