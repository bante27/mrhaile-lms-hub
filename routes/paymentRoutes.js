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

router.post('/initialize', protect, initializePayment);
router.get('/verify/:tx_ref', verifyPayment);

// Admin transaction history & status update
router.get('/admin/transactions', protect, admin, getAdminTransactions);
router.put('/admin/transactions/:id/status', protect, admin, updateTransactionStatus);

router.post('/simulate-success', protect, simulateSuccessfulPayment);
router.post('/test-email', protect, testEmailDelivery);

module.exports = router;