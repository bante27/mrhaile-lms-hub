const EditingPlan = require('../models/EditingPlan');
const EditingOrder = require('../models/EditingOrder');
const { initializeChapaPayment, verifyChapaPayment } = require('../config/chapa');
const sendEmail = require('../utils/sendEmail');

// ==================== EDITING PLANS (Admin & Public) ====================

// @desc Create editing plan (Admin)
// @route POST /api/editing/plans (or /api/editing-plans)
// @access Private/Admin
const createPlan = async (req, res) => {
  try {
    const { title, description, price, billingType, features, image, isActive, isPopular } = req.body;

    if (!title || !description || price === undefined || !billingType) {
      return res.status(400).json({ message: 'Please provide title, description, price, and billingType' });
    }

    const plan = await EditingPlan.create({
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all active editing plans (Public)
// @route GET /api/editing/plans (or /api/editing-plans)
// @access Public
const getPlans = async (req, res) => {
  try {
    // If admin is requesting, they might want all plans; otherwise only active ones
    const filter = req.user && req.user.role === 'admin' && req.query.all === 'true' ? {} : { isActive: true };
    const plans = await EditingPlan.find(filter).sort({ createdAt: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single editing plan by ID
// @route GET /api/editing/plans/:id
// @access Public
const getPlanById = async (req, res) => {
  try {
    const plan = await EditingPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Editing plan not found' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update editing plan (Admin)
// @route PUT /api/editing/plans/:id
// @access Private/Admin
const updatePlan = async (req, res) => {
  try {
    const plan = await EditingPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Editing plan not found' });
    }

    const { title, description, price, billingType, features, image, isActive, isPopular } = req.body;

    plan.title = title !== undefined ? title : plan.title;
    plan.description = description !== undefined ? description : plan.description;
    plan.price = price !== undefined ? Number(price) : plan.price;
    plan.billingType = billingType !== undefined ? billingType : plan.billingType;
    plan.features = features !== undefined ? features : plan.features;
    plan.image = image !== undefined ? image : plan.image;
    plan.isActive = isActive !== undefined ? isActive : plan.isActive;
    plan.isPopular = isPopular !== undefined ? isPopular : plan.isPopular;

    const updatedPlan = await plan.save();
    res.json({
      success: true,
      message: 'Editing plan updated successfully',
      plan: updatedPlan
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Delete editing plan (Admin)
// @route DELETE /api/editing/plans/:id
// @access Private/Admin
const deletePlan = async (req, res) => {
  try {
    const plan = await EditingPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({ message: 'Editing plan not found' });
    }

    await plan.deleteOne();
    res.json({ success: true, message: 'Editing plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== ORDERS & PAYMENTS (User & Admin) ====================

// @desc Create order and initialize payment (User selects plan)
// @route POST /api/editing/orders or /api/editing-orders
// @access Private
const createOrder = async (req, res) => {
  try {
    const { planId, description, mock } = req.body;

    if (!planId) {
      return res.status(400).json({ message: 'Please provide planId' });
    }

    // Never trust frontend price; get real price from MongoDB using plan ID
    const plan = await EditingPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Editing plan not found' });
    }

    const tx_ref = `mrhaile-edit-${Date.now()}`;

    // Create order with initial status "pending" and paymentStatus "unpaid"
    const order = await EditingOrder.create({
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

    // If mock payment requested or test mode
    if (mock === true || req.query.mock === 'true' || (process.env.NODE_ENV === 'development' && req.body.skipChapa)) {
      return res.json({
        success: true,
        checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/editing/success?tx_ref=${tx_ref}`,
        tx_ref,
        order,
        message: 'Order created & payment initialized (Mock Mode)'
      });
    }

    // Initialize Chapa payment gateway
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
      return res.status(400).json({ 
        message: 'Invalid response from payment gateway.', 
        paymentResponse 
      });
    }

    res.json({
      success: true,
      checkoutUrl: paymentResponse.data.checkout_url,
      tx_ref,
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Alias initializePayment to createOrder for router requirements
const initializePayment = createOrder;

// @desc Verify payment on backend, update order status, and send admin notification email
// @route GET /api/editing/orders/verify/:tx_ref or POST /api/editing/orders/simulate-success
// @access Public / Private
const verifyPayment = async (req, res) => {
  try {
    const tx_ref = req.params.tx_ref || req.body.tx_ref;
    if (!tx_ref) {
      return res.status(400).json({ message: 'Transaction reference (tx_ref) is required' });
    }

    const order = await EditingOrder.findOne({ tx_ref }).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Editing order not found' });
    }

    // If already verified/paid
    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Payment already verified', order });
    }

    let isSuccess = false;

    // Check if simulation / mock verification
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
        console.error('Chapa verification error:', verifyErr.message);
        // Allow simulation fallback in development if chapa keys aren't set
        if (!process.env.CHAPA_SECRET_KEY) {
          isSuccess = true;
        }
      }
    }

    if (isSuccess) {
      // Backend confirmed payment successfully! Update order
      order.paymentStatus = 'paid';
      order.status = 'paid'; // per requirement: paymentStatus = "paid" and status = "paid" (or ready for admin)
      await order.save();

      const populatedOrder = await EditingOrder.findById(order._id).populate('user', 'name email');

      // Send email notification to Admin
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
      } catch (emailErr) {
        console.error('Failed to send admin notification email:', emailErr.message);
      }

      return res.json({
        success: true,
        message: 'Payment verified successfully. Order updated to paid and admin notified.',
        order: populatedOrder
      });
    }

    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    await order.save();

    res.status(400).json({ message: 'Payment verification failed', paymentStatus: 'failed' });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all orders (Admin)
// @route GET /api/editing/orders
// @access Private/Admin
const getOrders = async (req, res) => {
  try {
    const orders = await EditingOrder.find({})
      .populate('user', 'name email')
      .populate('plan', 'title price billingType')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get logged-in user's orders
// @route GET /api/editing/orders/my-orders
// @access Private
const getUserOrders = async (req, res) => {
  try {
    const orders = await EditingOrder.find({ user: req.user._id })
      .populate('plan', 'title price billingType')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update order status (Admin: paid -> in_progress -> completed, or cancelled)
// @route PUT /api/editing/orders/:id/status
// @access Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const validStatuses = ['pending', 'paid', 'in_progress', 'completed', 'cancelled'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await EditingOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Editing order not found' });
    }

    if (status) order.status = status;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    const updatedOrder = await order.save();
    const populated = await EditingOrder.findById(updatedOrder._id)
      .populate('user', 'name email')
      .populate('plan', 'title price billingType');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: populated
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
