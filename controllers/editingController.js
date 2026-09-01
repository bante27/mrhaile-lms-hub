const editingBusinessService = require('../services/business/editingBusinessService');
const catchAsync = require('../utils/catchAsync');

const createPlan = catchAsync(async (req, res, next) => {
  const plan = await editingBusinessService.createNewPlan(req.body);
  res.status(201).json({
    success: true,
    message: 'Editing plan created successfully',
    plan
  });
});

const getPlans = catchAsync(async (req, res, next) => {
  const result = await editingBusinessService.fetchAllPlans(req.user, req.query);
  res.json(result);
});

const getPlanById = catchAsync(async (req, res, next) => {
  const result = await editingBusinessService.fetchPlanById(req.params.id);
  res.json(result);
});

const updatePlan = catchAsync(async (req, res, next) => {
  const updatedPlan = await editingBusinessService.updateExistingPlan(req.params.id, req.body);
  res.json({
    success: true,
    message: 'Editing plan updated successfully',
    plan: updatedPlan
  });
});

const deletePlan = catchAsync(async (req, res, next) => {
  await editingBusinessService.removePlan(req.params.id);
  res.json({ success: true, message: 'Editing plan deleted successfully' });
});

const createOrder = catchAsync(async (req, res, next) => {
  const result = await editingBusinessService.createNewOrder(req.body, req.query, req.user);
  res.json(result);
});

const initializePayment = createOrder;

const verifyPayment = catchAsync(async (req, res, next) => {
  const result = await editingBusinessService.verifyOrderPayment(req.params, req.body, req.query, req.path);
  res.json(result);
});

const getOrders = catchAsync(async (req, res, next) => {
  const result = await editingBusinessService.fetchAllOrders();
  res.json(result);
});

const getUserOrders = catchAsync(async (req, res, next) => {
  const result = await editingBusinessService.fetchUserOrders(req.user._id);
  res.json(result);
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
  const populated = await editingBusinessService.updateOrderStatus(req.params.id, req.body);
  res.json({
    success: true,
    message: 'Order status updated successfully',
    order: populated
  });
});

module.exports = {
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
};
