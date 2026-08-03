const express = require('express');
const router = express.Router();
const { 
  initializePayment, 
  verifyPayment, 
  simulateSuccessfulPayment, // 1. Import the new controller function
  testEmailDelivery 
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/initialize', protect, initializePayment);
router.get('/verify/:tx_ref', verifyPayment);

// 2. Add this new route handler for simulation
router.post('/simulate-success', protect, simulateSuccessfulPayment);

router.post('/test-email', protect, testEmailDelivery);

module.exports = router;