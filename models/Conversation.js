const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true,
    index: true 
  },
  adminId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  lastMessage: { 
    type: String, 
    default: '' 
  },
  lastMessageAt: { 
    type: Date, 
    default: Date.now 
  },
  unreadCount: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  status: { 
    type: String, 
    enum: ['active', 'closed', 'pending'], 
    default: 'active' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);
