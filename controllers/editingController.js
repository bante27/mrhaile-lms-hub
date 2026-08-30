const EditingPlan = require('../models/EditingPlan');
const EditingOrder = require('../models/EditingOrder');
const { initializeChapaPayment, verifyChapaPayment } = require('../config/chapa');
const sendEmail = require('../utils/sendEmail');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const planService = new BaseService(EditingPlan);
const orderService = new BaseService(EditingOrder);

const createPlan = catchAsync(async (req, res, next) => {
  const { title, description, price, billingType, features, image, isActive, isPopular } = req.body;

  if (!title || !description || price === undefined || !billingType) {
    return next(new AppError('Please provide title, description, price, and billingType', 400));
  }

  const plan = await planService.create({
    title,
    description,
    price: Number(price),
    billingType,
    features: features || [],
    image: image || '',
    isActive: isActive !== undefined ? isActive : true,
    isPopular: isPopular || false
  });

  res.status(201).json({
    success: true,
    message: 'Editing plan created successfully',
    plan
  });
});

const getPlans = catchAsync(async (req, res, next) => {
  const filter = req.user && req.user.role === 'admin' && req.query.all === 'true' ? {} : { isActive: true };
  const { data: plans, source } = await planService.getAll(filter, 1800, `plans-${JSON.stringify(filter)}`);

  const sorted = [...plans].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ source, plans: sorted });
});

const getPlanById = catchAsync(async (req, res, next) => {
  const { data: plan, source } = await planService.getById(req.params.id, 3600);
  if (!plan) {
    return next(new AppError('Editing plan not found', 404));
  }
  res.json({ source, plan });
});

const updatePlan = catchAsync(async (req, res, next) => {
  const { data: planObj } = await planService.getById(req.params.id, 3600);
  if (!planObj) {
    return next(new AppError('Editing plan not found', 404));
  }

  const { title, description, price, billingType, features, image, isActive, isPopular } = req.body;
  const updateData = {};

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (price !== undefined) updateData.price = Number(price);
  if (billingType !== undefined) updateData.billingType = billingType;
  if (features !== undefined) updateData.features = features;
  if (image !== undefined) updateData.image = image;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (isPopular !== undefined) updateData.isPopular = isPopular;

  const updatedPlan = await planService.update(req.params.id, updateData);
  res.json({
    success: true,
    message: 'Editing plan updated successfully',
    plan: updatedPlan
  });
});

const deletePlan = catchAsync(async (req, res, next) => {
  const plan = await planService.delete(req.params.id);
  if (!plan) {
    return next(new AppError('Editing plan not found', 404));
  }

  res.json({ success: true, message: 'Editing plan deleted successfully' });
});

const createOrder = catchAsync(async (req, res, next) => {
  const { planId, description, mock } = req.body;

  if (!planId) {
    return next(new AppError('Please provide planId', 400));
  }

  const { data: plan } = await planService.getById(planId, 3600);
  if (!plan) {
    return next(new AppError('Editing plan not found', 404));
  }

  const tx_ref = `mrhaile-edit-${Date.now()}`;

  const order = await orderService.create({
    user: req.user._id,
    plan: plan._id,
    planTitle: plan.title,
    price: plan.price,
    billingType: plan.billingType,
    description: description || '',
    tx_ref,
    paymentStatus: 'unpaid',
    status: 'pending'
  });

  if (mock === true || req.query.mock === 'true' || (process.env.NODE_ENV === 'development' && req.body.skipChapa)) {
    return res.json({
      success: true,
      checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/editing/success?tx_ref=${tx_ref}`,
      tx_ref,
      order,
      message: 'Order created & payment initialized (Mock Mode)'
    });
  }

  const chapaData = {
    amount: plan.price,
    currency: 'ETB',
    email: req.user.email,
    first_name: req.user.name ? req.user.name.split(' ')[0] : 'Client',
    last_name: req.user.name ? req.user.name.split(' ').slice(1).join(' ') : 'User',
    tx_ref,
    callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/editing/success?tx_ref=${tx_ref}`
  };

  const paymentResponse = await initializeChapaPayment(chapaData);

  if (!paymentResponse || !paymentResponse.data || !paymentResponse.data.checkout_url) {
    return next(new AppError('Invalid response from payment gateway.', 400));
  }

  res.json({
    success: true,
    checkoutUrl: paymentResponse.data.checkout_url,
    tx_ref,
    order
  });
});

const initializePayment = createOrder;

const verifyPayment = catchAsync(async (req, res, next) => {
  const tx_ref = req.params.tx_ref || req.body.tx_ref;
  if (!tx_ref) {
    return next(new AppError('Transaction reference (tx_ref) is required', 400));
  }

  const orders = await EditingOrder.find({ tx_ref }).populate('user', 'name email');
  const order = orders[0];
  if (!order) {
    return next(new AppError('Editing order not found', 404));
  }

  if (order.paymentStatus === 'paid') {
    return res.json({ success: true, message: 'Payment already verified', order });
  }

  let isSuccess = false;

  if (req.body.mock === true || req.query.mock === 'true' || req.path.includes('simulate-success') || process.env.NODE_ENV === 'development') {
    isSuccess = true;
  } else {
    try {
      const verification = await verifyChapaPayment(tx_ref);
      isSuccess =
        verification &&
        (verification.status === 'success' ||
          verification.status === 'successful' ||
          verification.data?.status === 'success' ||
          verification.data?.status === 'successful');
    } catch (verifyErr) {
      if (!process.env.CHAPA_SECRET_KEY) {
        isSuccess = true;
      }
    }
  }

  if (isSuccess) {
    await orderService.update(order._id, {
      paymentStatus: 'paid',
      status: 'paid'
    });

    const populatedOrder = await EditingOrder.findById(order._id).populate('user', 'name email');

    try {
      const adminEmail = process.env.MAIL_USERNAME || process.env.ADMIN_EMAIL || 'admin@mrhaile.com';
      await sendEmail({
        email: adminEmail,
        subject: 'New Editing Project Payment Received',
        message: `A user has successfully paid for the ${order.planTitle} editing plan.\n\n` +
          `User Name: ${populatedOrder.user?.name || 'N/A'}\n` +
          `User Email: ${populatedOrder.user?.email || 'N/A'}\n` +
          `Selected Plan: ${order.planTitle}\n` +
          `Plan Price: $${order.price}\n` +
          `Payment Reference: ${order.tx_ref}\n` +
          `Payment Status: paid\n` +
          `Order Date: ${order.createdAt}\n` +
          `Description/Notes: ${order.description || 'N/A'}`
      });
    } catch (emailErr) { }

    return res.json({
      success: true,
      message: 'Payment verified successfully. Order updated to paid and admin notified.',
      order: populatedOrder
    });
  }

  await orderService.update(order._id, {
    paymentStatus: 'failed',
    status: 'cancelled'
  });

  return next(new AppError('Payment verification failed', 400));
});

const getOrders = catchAsync(async (req, res, next) => {
  const { data: orders, source } = await orderService.getAll({}, 600, 'all-orders');
  const populatedOrders = await EditingOrder.populate(orders, [
    { path: 'user', select: 'name email' },
    { path: 'plan', select: 'title price billingType' }
  ]);
  res.json({ source, orders: populatedOrders });
});

const getUserOrders = catchAsync(async (req, res, next) => {
  const { data: orders, source } = await orderService.getAll({ user: req.user._id }, 600, `user-orders-${req.user._id}`);
  const populatedOrders = await EditingOrder.populate(orders, [
    { path: 'plan', select: 'title price billingType' }
  ]);
  res.json({ source, orders: populatedOrders });
});

const updateOrderStatus = catchAsync(async (req, res, next) => {
  const { status, paymentStatus } = req.body;
  const validStatuses = ['pending', 'paid', 'in_progress', 'completed', 'cancelled'];

  if (status && !validStatuses.includes(status)) {
    return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
  }

  const { data: orderObj } = await orderService.getById(req.params.id, 600);
  if (!orderObj) {
    return next(new AppError('Editing order not found', 404));
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (paymentStatus) updateData.paymentStatus = paymentStatus;

  const updatedOrder = await orderService.update(req.params.id, updateData);
  const populated = await EditingOrder.findById(updatedOrder._id)
    .populate('user', 'name email')
    .populate('plan', 'title price billingType');

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
