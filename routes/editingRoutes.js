const express = require('express');
const router = express.Router();
const {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  createOrder,
  initializePayment,
  verifyPayment,
  getOrders,
  getUserOrders,
  updateOrderStatus
} = require('../controllers/editingController');
const { protect, admin } = require('../middleware/authMiddleware');

// Plan Routes
router.route('/plans')
  .get(getPlans)
  .post(protect, admin, createPlan);

router.route('/plans/:id')
  .get(getPlanById)
  .put(protect, admin, updatePlan)
  .delete(protect, admin, deletePlan);

// Also support root-level /api/editing-plans for direct frontend calls
router.route('/')
  .get(getPlans)
  .post(protect, admin, createPlan);

router.route('/:id')
  .get(getPlanById)
  .put(protect, admin, updatePlan)
  .delete(protect, admin, deletePlan);

// Order & Payment Routes
router.post('/orders', protect, createOrder);
router.post('/orders/initialize', protect, initializePayment);
router.get('/orders/verify/:tx_ref', verifyPayment);
router.post('/orders/simulate-success', protect, verifyPayment);

router.get('/orders', protect, admin, getOrders);
router.get('/orders/my-orders', protect, getUserOrders);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
