const express = require('express');
const router = express.Router();
const { 
  subscribeNewsletter, 
  broadcastNewsletter, 
  getSubscribers 
} = require('../controllers/newsletterController');
const { protect, admin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { 
  subscribeNewsletterSchema, 
  broadcastNewsletterSchema 
} = require('../validation/newsletterValidation');

router.post('/subscribe', validate(subscribeNewsletterSchema), subscribeNewsletter);
router.post('/broadcast', protect, admin, validate(broadcastNewsletterSchema), broadcastNewsletter);
router.get('/subscribers', protect, admin, getSubscribers);

module.exports = router;
