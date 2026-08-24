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

router.route('/:conversationId/messages')
  .get(protect, getMessages)
  .post(protect, sendMessage);

router.route('/:conversationId/read')
  .patch(protect, markConversationRead);

router.route('/:conversationId/status')
  .patch(protect, admin, updateConversationStatus);

router.route('/messages/:messageId/read')
  .patch(protect, markMessageRead);

router.route('/messages/:messageId/delete')
  .patch(protect, deleteMessage);

module.exports = router;
