const chatBusinessService = require('../services/business/chatBusinessService');
const catchAsync = require('../utils/catchAsync');

const getConversations = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.fetchConversations(req.user, req.query);
  res.status(200).json(result);
});

const getMessages = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.fetchMessages(req.params.conversationId, req.user);
  res.status(200).json(result);
});

const sendMessage = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.sendNewMessage(req.params.conversationId, req.body.text, req.user);
  res.status(201).json(result);
});

const markMessageRead = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.markMessageAsRead(req.params.messageId, req.user);
  res.status(200).json(result);
});

const markConversationRead = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.markConversationAsRead(req.params.conversationId, req.user);
  res.status(200).json(result);
});

const deleteMessage = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.deleteSpecificMessage(req.params.messageId, req.user);
  res.status(200).json(result);
});

const updateConversationStatus = catchAsync(async (req, res, next) => {
  const result = await chatBusinessService.updateConvStatus(req.params.conversationId, req.body.status, req.user);
  res.status(200).json(result);
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
