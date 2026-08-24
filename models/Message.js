const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true,
    index: true 
  },
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  senderRole: { 
    type: String, 
    enum: ['student', 'admin', 'superadmin', 'instructor'], 
    required: true 
  },
  text: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 5000 
  },
  isRead: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  deletedAt: { 
    type: Date, 
    default: null 
  },
  deletedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  }
}, { timestamps: true });

// Index for efficient message retrieval sorted by creation time
messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
