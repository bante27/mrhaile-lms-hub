const Order = require('../models/Order');
const Course = require('../models/Course');
const User = require('../models/User');
const { initializeChapaPayment, verifyChapaPayment } = require('../config/chapa');
const sendEmail = require('../utils/sendEmail');

// @desc Initialize payment with Chapa
// @route POST /api/payments/initialize
const initializePayment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Not authorized, please login first with Bearer token' });
    }

    const { courseId, amount } = req.body;
    if (!courseId) {
      return res.status(400).json({ message: 'Please provide courseId in request body' });
    }

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

    if (!paymentResponse || !paymentResponse.data || !paymentResponse.data.checkout_url) {
      return res.status(400).json({ 
        message: 'Invalid response from Chapa payment gateway. Please check your API keys or Test Mode settings.', 
        paymentResponse 
      });
    }

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

    const isSuccess = 
      verification && 
      (verification.status === 'success' || 
       verification.status === 'successful' || 
       verification.data?.status === 'success' || 
       verification.data?.status === 'successful');

    if (isSuccess) {
      const order = await Order.findOne({ tx_ref }).populate('user course');
      if (order) {
        if (order.status !== 'completed') {
          order.status = 'completed';
          await order.save();
        }

        const userId = order.user?._id || order.user;
        const courseId = order.course?._id || order.course;
        const userEmail = order.user?.email;
        const userFirstName = order.user?.firstName || 'Student';
        const courseTitle = order.course?.title || 'Course';

        if (userId && courseId) {
          // Enroll user in course (adds course ID to enrolledCourses array)
          await User.findByIdAndUpdate(userId, {
            $addToSet: { enrolledCourses: courseId }
          });
        }

        // Send confirmation email with course watch/access link (if not already sent or retryable)
        if (userEmail && courseId) {
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const courseWatchLink = `${frontendUrl}/courses/${courseId}`;

            await sendEmail({
              email: userEmail,
              subject: `Payment Successful! Access Your Course: ${courseTitle} - MrHaile.com`,
              message: `Hello ${userFirstName},\n\nYour payment for "${courseTitle}" was successful!\n\nYou can now watch and access your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
            });
          } catch (emailErr) {
            console.error('Failed to send course access email:', emailErr.message);
          }
        }
      }

      return res.json({ message: 'Payment verified successfully. Course unlocked and access link sent to email!', status: 'success' });
    }

    res.status(400).json({ message: 'Payment verification failed or pending', status: verification?.status || 'unknown' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Simulate successful payment directly in Postman (Bypasses Chapa external redirect)
// @route POST /api/payments/simulate-success
const simulateSuccessfulPayment = async (req, res) => {
  try {
    const { tx_ref } = req.body;
    if (!tx_ref) {
      return res.status(400).json({ message: 'Please provide tx_ref in request body' });
    }

    const order = await Order.findOne({ tx_ref }).populate('user course');
    if (!order) {
      return res.status(404).json({ message: 'Order not found with this tx_ref' });
    }

    // Force update order status and enroll user
    order.status = 'completed';
    await order.save();

    const userId = order.user?._id || order.user;
    const courseId = order.course?._id || order.course;
    const userEmail = order.user?.email;
    const userFirstName = order.user?.firstName || 'Student';
    const courseTitle = order.course?.title || 'Course';

    if (userId && courseId) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: { enrolledCourses: courseId }
      });
    }

    // Send confirmation email with link
    if (userEmail && courseId) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const courseWatchLink = `${frontendUrl}/courses/${courseId}`;

      await sendEmail({
        email: userEmail,
        subject: `[Simulated] Access Your Course: ${courseTitle} - MrHaile.com`,
        message: `Hello ${userFirstName},\n\nYour payment for "${courseTitle}" was successfully simulated!\n\nYou can watch your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
      });
    }

    res.json({ 
      message: 'Payment successfully simulated! User enrolled, order marked completed, and email sent.', 
      courseWatchLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses/${courseId}`,
      enrolledCourseId: courseId 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Test email delivery directly in Postman
// @route POST /api/payments/test-email
const testEmailDelivery = async (req, res) => {
  try {
    const { email, courseTitle } = req.body;
    const targetEmail = email || req.user.email;
    const title = courseTitle || 'Advanced Video Editing Masterclass';
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const courseWatchLink = `${frontendUrl}/courses/sample-id`;

    await sendEmail({
      email: targetEmail,
      subject: `[Test] Access Your Course: ${title} - MrHaile.com`,
      message: `Hello ${req.user.firstName || 'Student'},\n\nThis is a test verification email for "${title}"!\n\nYou can watch your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
    });

    res.json({ message: `Test email successfully sent to ${targetEmail}!` });
  } catch (error) {
    res.status(500).json({ message: 'Email sending failed: ' + error.message });
  }
};

module.exports = { initializePayment, verifyPayment, simulateSuccessfulPayment, testEmailDelivery };