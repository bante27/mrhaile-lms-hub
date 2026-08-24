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

router.route('/')
  .get(protect, getConversations);

router.route('/messages/:messageId/read')
  .patch(protect, markMessageRead);

router.route('/messages/:messageId/delete')
  .patch(protect, deleteMessage);

router.route('/:conversationId/messages')
  .get(protect, getMessages)
  .post(protect, sendMessage);

module.exports = router;
