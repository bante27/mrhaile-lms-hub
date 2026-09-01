const paymentBusinessService = require('../services/business/paymentBusinessService');
const catchAsync = require('../utils/catchAsync');

const initializePayment = catchAsync(async (req, res, next) => {
  const result = await paymentBusinessService.initializePayment(req.body, req.query, req.user);
  res.json(result);
});

const verifyPayment = catchAsync(async (req, res, next) => {
  const result = await paymentBusinessService.verifyPayment(req.params.tx_ref);
  res.json(result);
});

const simulateSuccessfulPayment = catchAsync(async (req, res, next) => {
  const result = await paymentBusinessService.simulatePayment(req.body, req.query, req.user);
  res.json(result);
});

const testEmailDelivery = catchAsync(async (req, res, next) => {
  const result = await paymentBusinessService.testEmail(req.body, req.user);
  res.json(result);
});

const getAdminTransactions = catchAsync(async (req, res, next) => {
  const result = await paymentBusinessService.fetchAdminTransactions();
  res.json(result);
});

const updateTransactionStatus = catchAsync(async (req, res, next) => {
  const order = await paymentBusinessService.updateTransactionStatus(req.params.id, req.body.status);
  res.json({
    success: true,
    message: `Transaction status updated to ${req.body.status} successfully`,
    order
  });
});

module.exports = {
  initializePayment,
  verifyPayment,
  simulateSuccessfulPayment,
  testEmailDelivery,
  getAdminTransactions,
  updateTransactionStatus
};
