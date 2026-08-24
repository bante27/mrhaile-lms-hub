const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// @desc    Get or create conversation for the authenticated user (or get all for admin)
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const { role, _id: userId } = req.user;
    const isAdmin = role === 'admin' || role === 'superadmin';

    if (isAdmin) {
      const { search, status } = req.query;
      let query = {};
      
      if (status) {
        query.status = status;
      }

      let conversations = await Conversation.find(query)
        .populate('userId', 'firstName lastName email profileImage phone isBlocked')
        .sort({ lastMessageAt: -1 });

      // If search filter is provided, filter populated users
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        conversations = conversations.filter(conv => {
          if (!conv.userId) return false;
          const fullName = `${conv.userId.firstName} ${conv.userId.lastName}`.toLowerCase();
          const email = conv.userId.email.toLowerCase();
          const phone = (conv.userId.phone || '').toLowerCase();
          return searchRegex.test(fullName) || searchRegex.test(email) || searchRegex.test(phone) || searchRegex.test(conv.lastMessage);
        });
      }

      return res.status(200).json({
        success: true,
        count: conversations.length,
        conversations
      });
    } else {
      // Regular user: gets or creates their own conversation
      let conversation = await Conversation.findOne({ userId })
        .populate('userId', 'firstName lastName email profileImage phone');

      if (!conversation) {
        conversation = await Conversation.create({
          userId,
          lastMessage: 'Conversation started',
          lastMessageAt: new Date(),
          unreadCount: 0,
          status: 'active'
        });
        conversation = await Conversation.findById(conversation._id)
          .populate('userId', 'firstName lastName email profileImage phone');
      }

      return res.status(200).json({
        success: true,
        conversation
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a specific conversation
// @route   GET /api/conversations/:conversationId/messages
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { role, _id: userId } = req.user;
    const isAdmin = role === 'admin' || role === 'superadmin';

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    // Authorization check
    if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to access this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'firstName lastName profileImage role')
      .sort({ createdAt: 1 });

    // Format messages for display (handle soft deletion text replacement)
    const formattedMessages = messages.map(msg => {
      const msgObj = msg.toObject();
      if (msgObj.deletedAt) {
        msgObj.text = 'This message was deleted';
      }
      return msgObj;
    });

    return res.status(200).json({
      success: true,
      count: formattedMessages.length,
      messages: formattedMessages
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message via REST API (fallback / optional)
// @route   POST /api/conversations/:conversationId/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;
    const { role, _id: userId } = req.user;
    const isAdmin = role === 'admin' || role === 'superadmin';

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to send messages in this conversation' });
    }

    // If admin sends message, unreadCount for user increases if user is recipient, etc.
    let unreadCountIncrement = 0;
    if (isAdmin) {
      unreadCountIncrement = 1;
    } else {
      // If user sends message, increment unread count for admin view
      unreadCountIncrement = 1;
    }

    const message = await Message.create({
      conversationId,
      senderId: userId,
      senderRole: role,
      text: text.trim(),
      isRead: false
    });

    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();
    if (isAdmin) {
      conversation.adminId = userId;
    }
    conversation.unreadCount = (conversation.unreadCount || 0) + unreadCountIncrement;
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'firstName lastName profileImage role');

    return res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark message as read
// @route   PATCH /api/messages/:messageId/read
// @access  Private
const markMessageRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { role, _id: userId } = req.user;
    const isAdmin = role === 'admin' || role === 'superadmin';

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    message.isRead = true;
    await message.save();

    // Reset unread count on conversation if applicable
    if (conversation.unreadCount > 0) {
      conversation.unreadCount = Math.max(0, conversation.unreadCount - 1);
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all messages in conversation as read
// @route   PATCH /api/conversations/:conversationId/read
// @access  Private
const markConversationRead = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { role, _id: userId } = req.user;
    const isAdmin = role === 'admin' || role === 'superadmin';

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Message.updateMany(
      { conversationId, isRead: false, senderId: { $ne: userId } },
      { $set: { isRead: true } }
    );

    conversation.unreadCount = 0;
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete message (Delete for me or Delete for everyone)
// @route   PATCH /api/messages/:messageId/delete
// @access  Private
const deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteType } = req.body; // 'everyone' or 'me'
    const { role, _id: userId } = req.user;
    const isAdmin = role === 'admin' || role === 'superadmin';

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (deleteType === 'everyone') {
      // Only sender or admin can delete for everyone
      if (message.senderId.toString() !== userId.toString() && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You can only delete your own messages for everyone' });
      }
      message.deletedAt = new Date();
      message.deletedBy = userId;
      message.text = 'This message was deleted';
      await message.save();
    } else {
      // Delete for me - can be handled client-side or flagged. We'll mark deletedAt for the user or flag it.
      // For simplicity in 1-to-1 chat, deleteType 'everyone' soft deletes the message content.
      message.deletedAt = new Date();
      message.deletedBy = userId;
      message.text = 'This message was deleted';
      await message.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
      deletedMessageId: messageId,
      conversationId: message.conversationId
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update conversation status (active, closed, pending)
// @route   PATCH /api/conversations/:conversationId/status
// @access  Private (Admin only)
const updateConversationStatus = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;

    if (!['active', 'closed', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    conversation.status = status;
    await conversation.save();

    return res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markMessageRead,
  markConversationRead,
  deleteMessage,
  updateConversationStatus
};
