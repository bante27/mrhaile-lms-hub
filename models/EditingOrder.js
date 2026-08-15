const mongoose = require('mongoose');

const editingOrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'EditingPlan', required: true },
  planTitle: { type: String, required: true },
  price: { type: Number, required: true },
  billingType: { type: String, required: true },
  description: { type: String, default: '' },
  tx_ref: { type: String, required: true, unique: true },
  paymentStatus: { 
    type: String, 
    enum: ['unpaid', 'paid', 'failed'], 
    default: 'unpaid' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'paid', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' 
  }
}, { timestamps: true });

module.exports = mongoose.model('EditingOrder', editingOrderSchema);
