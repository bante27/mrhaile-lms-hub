const express = require('express');
const router = express.Router();
const {
  getConversations,
  getMessages,
  sendMessage,
  markMessageRead,
  markConversationRead,
  deleteMessage,
  updateConversationStatus
} = require('../controllers/chatController');
const { protect, admin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { sendMessageSchema, conversationIdSchema, updateStatusSchema } = require('../validation/chatValidation');

router.route('/')
  .get(protect, getConversations);

router.route('/messages/:messageId/read')
  .patch(protect, markMessageRead);

router.route('/messages/:messageId/delete')
  .patch(protect, deleteMessage);

router.route('/:conversationId/messages')
  .get(protect, validate(conversationIdSchema), getMessages)
  .post(protect, validate(sendMessageSchema), sendMessage);

module.exports = router;

