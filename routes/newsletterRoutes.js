const express = require('express');
const router = express.Router();
const { 
  subscribeNewsletter, 
  broadcastNewsletter, 
  getSubscribers 
} = require('../controllers/newsletterController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/subscribe', subscribeNewsletter);
router.post('/broadcast', protect, admin, broadcastNewsletter);
router.get('/subscribers', protect, admin, getSubscribers);

module.exports = router;
