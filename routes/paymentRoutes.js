const express = require('express');
const router = express.Router();
const { 
  initializePayment, 
  verifyPayment, 
  simulateSuccessfulPayment, 
  testEmailDelivery,
  getAdminTransactions 
} = require('../controllers/paymentController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/initialize', protect, initializePayment);
router.get('/verify/:tx_ref', verifyPayment);

// Admin transaction history
router.get('/admin/transactions', protect, admin, getAdminTransactions);

router.post('/simulate-success', protect, simulateSuccessfulPayment);
router.post('/test-email', protect, testEmailDelivery);

module.exports = router;