const express = require('express');
const router = express.Router();
const { submitInquiry, getInquiries, getInquiryById, replyInquiry, getMyInquiries } = require('../controllers/serviceController');
const { protect, admin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { submitInquirySchema, replyInquirySchema, inquiryIdSchema } = require('../validation/serviceValidation');

router.post('/inquiry', validate(submitInquirySchema), submitInquiry);
router.get('/inquiries', protect, admin, getInquiries);
router.get('/inquiries/:id', protect, validate(inquiryIdSchema), getInquiryById);
router.get('/my-inquiries', protect, getMyInquiries);
router.post('/inquiries/:id/reply', protect, admin, validate(replyInquirySchema), replyInquiry);

module.exports = router;
