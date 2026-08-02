const Order = require('../models/Order');
const Course = require('../models/Course');
const User = require('../models/User');
const { initializeChapaPayment, verifyChapaPayment } = require('../config/chapa');
const sendEmail = require('../utils/sendEmail');

// @desc Initialize payment with Chapa
// @route POST /api/payments/initialize
const initializePayment = async (req, res) => {
  try {
    const { courseId, amount } = req.body;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const tx_ref = `mrhaile-${Date.now()}`;

    const order = await Order.create({
      user: req.user._id,
      course: courseId,
      amount: amount || course.price,
      tx_ref,
      status: 'pending'
    });

    const chapaData = {
      amount: order.amount,
      currency: 'ETB',
      email: req.user.email,
      first_name: req.user.firstName || 'Student',
      last_name: req.user.lastName || 'User',
      tx_ref,
      callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?tx_ref=${tx_ref}`
    };

    const paymentResponse = await initializeChapaPayment(chapaData);

    res.json({
      checkoutUrl: paymentResponse.data.checkout_url,
      tx_ref
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Verify Chapa payment, auto-enroll user, and send access/watch link via email
// @route GET /api/payments/verify/:tx_ref
const verifyPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    const verification = await verifyChapaPayment(tx_ref);

    if (verification.status === 'success') {
      const order = await Order.findOne({ tx_ref }).populate('user course');
      if (order && order.status !== 'completed') {
        order.status = 'completed';
        await order.save();

        // Enroll user in course
        await User.findByIdAndUpdate(order.user._id, {
          $addToSet: { enrolledCourses: order.course._id }
        });

        // Send confirmation email with course watch/access link
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const courseWatchLink = `${frontendUrl}/courses/${order.course._id}`;

          await sendEmail({
            email: order.user.email,
            subject: `Payment Successful! Access Your Course: ${order.course.title} - MrHaile.com`,
            message: `Hello ${order.user.firstName || 'Student'},\n\nYour payment for "${order.course.title}" was successful!\n\nYou can now watch and access your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
          });
        } catch (emailErr) {
          console.error('Failed to send course access email:', emailErr.message);
        }
      }

      return res.json({ message: 'Payment verified successfully. Course unlocked and access link sent to email!', status: 'success' });
    }

    res.status(400).json({ message: 'Payment verification failed', status: verification.status });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { initializePayment, verifyPayment };
