const express = require('express');
const router = express.Router();
const {
  initializePayment,
  verifyPayment,
  simulateSuccessfulPayment,
  testEmailDelivery,
  getAdminTransactions,
  updateTransactionStatus
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const {
  initializePaymentSchema,
  verifyPaymentSchema,
  simulatePaymentSchema,
  testEmailSchema,
  updateTransactionStatusSchema,
} = require('../validation/paymentValidation');

router.post('/initialize', protect, validate(initializePaymentSchema), initializePayment);
router.get('/verify/:tx_ref', validate(verifyPaymentSchema), verifyPayment);

// Admin transaction history & status update
router.get('/admin/transactions', protect, admin, getAdminTransactions);
router.put('/admin/transactions/:id/status', protect, admin, validate(updateTransactionStatusSchema), updateTransactionStatus);

router.post('/simulate-success', protect, validate(simulatePaymentSchema), simulateSuccessfulPayment);
router.post('/test-email', protect, validate(testEmailSchema), testEmailDelivery);

module.exports = router;
