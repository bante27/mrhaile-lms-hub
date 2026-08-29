const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries, getInquiryById, replyInquiry, getMyInquiries } = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/inquiry', submitInquiry);
router.get('/inquiries', protect, admin, getInquiries);
router.get('/inquiries/:id', protect, getInquiryById);
router.get('/my-inquiries', protect, getMyInquiries);
router.post('/inquiries/:id/reply', protect, admin, replyInquiry);

module.exports = router;
