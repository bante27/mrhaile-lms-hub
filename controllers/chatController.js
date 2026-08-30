const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const conversationService = new BaseService(Conversation);
const messageService = new BaseService(Message);

const getConversations = catchAsync(async (req, res, next) => {
  const { role, _id: userId } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  if (isAdmin) {
    const { search, status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    const { data: rawConversations, source } = await conversationService.getAll(query, 300, `admin-convs-${JSON.stringify(query)}`);
    let conversations = await Conversation.populate(rawConversations, {
      path: 'userId',
      select: 'firstName lastName email profileImage phone isBlocked'
    });

    conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

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
      source,
      count: conversations.length,
      conversations
    });
  } else {
    const { data: convs } = await conversationService.getAll({ userId }, 300, `user-conv-${userId}`);
    let conversation = convs && convs.length > 0 ? convs[0] : null;

    if (!conversation) {
      conversation = await conversationService.create({
        userId,
        lastMessage: 'Conversation started',
        lastMessageAt: new Date(),
        unreadCount: 0,
        status: 'active'
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('userId', 'firstName lastName email profileImage phone');

    return res.status(200).json({
      success: true,
      source: 'database',
      conversation: populated
    });
  }
});

const getMessages = catchAsync(async (req, res, next) => {
  let { conversationId } = req.params;
  const { role, _id: userId } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  let conversation;
  if (conversationId === 'me' || !mongoose.isValidObjectId(conversationId)) {
    const { data: convs } = await conversationService.getAll({ userId: isAdmin ? userId : userId }, 300, `user-conv-${userId}`);
    conversation = convs && convs.length > 0 ? convs[0] : null;
    if (!conversation) {
      conversation = await conversationService.create({
        userId: isAdmin ? userId : userId,
        lastMessage: 'Conversation started',
        lastMessageAt: new Date(),
        unreadCount: 0,
        status: 'active'
      });
    }
  } else {
    const { data: conv } = await conversationService.getById(conversationId, 300);
    conversation = conv;
  }

  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
    return next(new AppError('Not authorized to access this conversation', 403));
  }

  const { data: messages, source } = await messageService.getAll({ conversationId: conversation._id }, 300, `messages-${conversation._id}`);
  const populatedMessages = await Message.populate(messages, {
    path: 'senderId',
    select: 'firstName lastName profileImage role'
  });

  populatedMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const formattedMessages = populatedMessages.map(msg => {
    const msgObj = msg.toObject ? msg.toObject() : msg;
    if (msgObj.deletedAt) {
      msgObj.text = 'This message was deleted';
    }
    return msgObj;
  });

  return res.status(200).json({
    success: true,
    source,
    conversationId: conversation._id,
    count: formattedMessages.length,
    messages: formattedMessages
  });
});

const sendMessage = catchAsync(async (req, res, next) => {
  let { conversationId } = req.params;
  const { text } = req.body;
  const { role, _id: userId } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  let conversation;
  if (conversationId === 'me' || !mongoose.isValidObjectId(conversationId)) {
    const { data: convs } = await conversationService.getAll({ userId }, 300, `user-conv-${userId}`);
    conversation = convs && convs.length > 0 ? convs[0] : null;
    if (!conversation) {
      conversation = await conversationService.create({
        userId,
        lastMessage: text.trim(),
        lastMessageAt: new Date(),
        unreadCount: 1,
        status: 'active'
      });
    }
  } else {
    const { data: conv } = await conversationService.getById(conversationId, 300);
    conversation = conv;
  }

  if (!conversation) {
    conversation = await conversationService.create({
      userId: isAdmin ? userId : userId,
      lastMessage: text.trim(),
      lastMessageAt: new Date(),
      unreadCount: 1,
      status: 'active'
    });
  }

  if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
    return next(new AppError('Not authorized', 403));
  }

  const message = await messageService.create({
    conversationId: conversation._id,
    senderId: userId,
    senderRole: role,
    text: text.trim(),
    isRead: false
  });

  const updateData = {
    lastMessage: text.trim(),
    lastMessageAt: new Date()
  };
  if (isAdmin) {
    updateData.adminId = userId;
  } else {
    updateData.unreadCount = (conversation.unreadCount || 0) + 1;
  }

  await conversationService.update(conversation._id, updateData);

  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', 'firstName lastName profileImage role');

  return res.status(201).json({
    success: true,
    conversationId: conversation._id,
    message: populatedMessage
  });
});

const markMessageRead = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { role, _id: userId } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  const { data: message } = await messageService.getById(messageId, 300);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  const { data: conversation } = await conversationService.getById(message.conversationId, 300);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
    return next(new AppError('Not authorized', 403));
  }

  await messageService.update(messageId, { isRead: true });

  if (conversation.unreadCount > 0) {
    const newUnread = Math.max(0, conversation.unreadCount - 1);
    await conversationService.update(conversation._id, { unreadCount: newUnread });
  }

  return res.status(200).json({
    success: true,
    message: 'Message marked as read'
  });
});

const markConversationRead = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const { role, _id: userId } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  const { data: conversation } = await conversationService.getById(conversationId, 300);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  if (!isAdmin && conversation.userId.toString() !== userId.toString()) {
    return next(new AppError('Not authorized', 403));
  }

  await messageService.updateMany({ conversationId: conversation._id, isRead: false }, { isRead: true });
  await conversationService.update(conversation._id, { unreadCount: 0 });

  return res.status(200).json({
    success: true,
    message: 'Conversation marked as read'
  });
});

const deleteMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;
  const { role, _id: userId } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  const { data: message } = await messageService.getById(messageId, 300);
  if (!message) {
    return next(new AppError('Message not found', 404));
  }

  if (!isAdmin && message.senderId.toString() !== userId.toString()) {
    return next(new AppError('Not authorized to delete this message', 403));
  }

  await messageService.update(messageId, { deletedAt: new Date(), text: 'This message was deleted' });

  return res.status(200).json({
    success: true,
    message: 'Message deleted successfully'
  });
});

const updateConversationStatus = catchAsync(async (req, res, next) => {
  const { conversationId } = req.params;
  const { status } = req.body;
  const { role } = req.user;
  const isAdmin = role === 'admin' || role === 'superadmin';

  if (!isAdmin) {
    return next(new AppError('Not authorized', 403));
  }

  const { data: conversation } = await conversationService.getById(conversationId, 300);
  if (!conversation) {
    return next(new AppError('Conversation not found', 404));
  }

  const updated = await conversationService.update(conversationId, { status });

  return res.status(200).json({
    success: true,
    message: 'Conversation status updated successfully',
    conversation: updated
  });
});

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markMessageRead,
  markConversationRead,
  deleteMessage,
  updateConversationStatus
};
