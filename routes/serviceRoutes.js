const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries } = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/inquiry', submitInquiry);
router.get('/inquiries', protect, admin, getInquiries);

module.exports = router;

