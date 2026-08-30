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
const validate = require('../middleware/validateMiddleware');
const {
  createEditingPlanSchema,
  updateEditingPlanSchema,
  createEditingOrderSchema,
  planIdSchema
} = require('../validation/editingValidation');

// Plan Routes
router.route('/plans')
  .get(getPlans)
  .post(protect, admin, validate(createEditingPlanSchema), createPlan);

router.route('/plans/:id')
  .get(validate(planIdSchema), getPlanById)
  .put(protect, admin, validate(updateEditingPlanSchema), updatePlan)
  .delete(protect, admin, validate(planIdSchema), deletePlan);

// Also support root-level /api/editing-plans for direct frontend calls
router.route('/')
  .get(getPlans)
  .post(protect, admin, validate(createEditingPlanSchema), createPlan);

router.route('/:id')
  .get(validate(planIdSchema), getPlanById)
  .put(protect, admin, validate(updateEditingPlanSchema), updatePlan)
  .delete(protect, admin, validate(planIdSchema), deletePlan);

// Order & Payment Routes
router.post('/orders', protect, validate(createEditingOrderSchema), createOrder);
router.post('/orders/initialize', protect, validate(createEditingOrderSchema), initializePayment);
router.get('/orders/verify/:tx_ref', verifyPayment);
router.post('/orders/simulate-success', protect, verifyPayment);

router.get('/orders', protect, admin, getOrders);
router.get('/orders/my-orders', protect, getUserOrders);
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

module.exports = router;
