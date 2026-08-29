const Order = require('../models/Order');
const Course = require('../models/Course');
const User = require('../models/User');
const { initializeChapaPayment, verifyChapaPayment } = require('../config/chapa');
const sendEmail = require('../utils/sendEmail');
const BaseService = require('../services/BaseService');

const orderService = new BaseService(Order);
const courseService = new BaseService(Course);
const userService = new BaseService(User);

const initializePayment = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Not authorized, please login first with Bearer token' });
    }

    const { courseId, amount } = req.body;
    if (!courseId) {
      return res.status(400).json({ message: 'Please provide courseId in request body' });
    }

    const { data: course } = await courseService.getById(courseId, 3600);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const tx_ref = `mrhaile-${Date.now()}`;

    const order = await orderService.create({
      user: req.user._id,
      course: courseId,
      amount: amount || course.price,
      tx_ref,
      status: 'pending'
    });

    if (req.body.mock === true || req.query.mock === 'true') {
      return res.json({
        checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?tx_ref=${tx_ref}`,
        tx_ref,
        message: 'Mock payment initialized successfully'
      });
    }

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
      const orders = await Order.find({ tx_ref }).populate('user course');
      const order = orders[0];
      if (order) {
        if (order.status !== 'completed') {
          await orderService.update(order._id, { status: 'completed' });
        }

        const userId = order.user?._id || order.user;
        const courseId = order.course?._id || order.course;
        const userEmail = order.user?.email;
        const userFirstName = order.user?.firstName || 'Student';
        const courseTitle = order.course?.title || 'Course';

        if (userId && courseId) {
          const userObj = await User.findById(userId);
          if (userObj) {
            const enrolled = userObj.enrolledCourses ? userObj.enrolledCourses.map(id => id.toString()) : [];
            if (!enrolled.includes(courseId.toString())) {
              enrolled.push(courseId);
              await userService.update(userId, { enrolledCourses: enrolled });
            }
          }
        }

        if (userEmail && courseId) {
          try {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const courseWatchLink = `${frontendUrl}/courses/${courseId}`;

            await sendEmail({
              email: userEmail,
              subject: `Payment Successful! Access Your Course: ${courseTitle} - MrHaile.com`,
              message: `Hello ${userFirstName},\n\nYour payment for "${courseTitle}" was successful!\n\nYou can now watch and access your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
            });
          } catch (emailErr) { }
        }
      }

      return res.json({ message: 'Payment verified successfully. Course unlocked and access link sent to email!', status: 'success' });
    }

    res.status(400).json({ message: 'Payment verification failed or pending', status: verification?.status || 'unknown' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const simulateSuccessfulPayment = async (req, res) => {
  try {
    const { tx_ref, courseId } = req.body;

    let order = null;
    if (tx_ref) {
      const orders = await Order.find({ tx_ref }).populate('user course');
      order = orders[0];
    }

    if (!order) {
      let targetCourseId = courseId;
      if (!targetCourseId) {
        const { data: courses } = await courseService.getAll({}, 3600, 'first-course');
        if (!courses || courses.length === 0) {
          return res.status(404).json({ message: 'No courses found in database to simulate enrollment' });
        }
        targetCourseId = courses[0]._id;
      }

      const { data: course } = await courseService.getById(targetCourseId, 3600);
      order = await orderService.create({
        user: req.user._id,
        course: targetCourseId,
        amount: course ? course.price : 0,
        tx_ref: tx_ref || `mrhaile-sim-${Date.now()}`,
        status: 'completed'
      });
      order = await Order.findById(order._id).populate('user course');
    } else {
      await orderService.update(order._id, { status: 'completed' });
    }

    const userId = order.user?._id || order.user;
    const finalCourseId = order.course?._id || order.course;
    const userEmail = order.user?.email || req.user.email;
    const userFirstName = order.user?.firstName || req.user.firstName || 'Student';
    const courseTitle = order.course?.title || 'Course';

    if (userId && finalCourseId) {
      const userObj = await User.findById(userId);
      if (userObj) {
        const enrolled = userObj.enrolledCourses ? userObj.enrolledCourses.map(id => id.toString()) : [];
        if (!enrolled.includes(finalCourseId.toString())) {
          enrolled.push(finalCourseId);
          await userService.update(userId, { enrolledCourses: enrolled });
        }
      }
    }

    if (userEmail && finalCourseId) {
      try {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const courseWatchLink = `${frontendUrl}/courses/${finalCourseId}`;

        await sendEmail({
          email: userEmail,
          subject: `[Simulated] Access Your Course: ${courseTitle} - MrHaile.com`,
          message: `Hello ${userFirstName},\n\nYour payment for "${courseTitle}" was successfully simulated!\n\nYou can watch your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
        });
      } catch (emailErr) { }
    }

    res.json({
      message: 'Payment successfully simulated! User enrolled, order marked completed, and email sent.',
      courseWatchLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses/${finalCourseId}`,
      enrolledCourseId: finalCourseId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

const getAdminTransactions = async (req, res) => {
  try {
    const { data: orders, source } = await orderService.getAll({}, 600, 'admin-transactions');
    const populated = await Order.populate(orders, [
      { path: 'user', select: 'firstName lastName email phone' },
      { path: 'course', select: 'title price' }
    ]);
    res.json({ source, orders: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, completed, or failed' });
    }

    const { data: orderObj } = await orderService.getById(req.params.id, 600);
    if (!orderObj) {
      return res.status(404).json({ message: 'Transaction/Order not found' });
    }

    const previousStatus = orderObj.status;
    const updatedOrder = await orderService.update(req.params.id, { status });
    const order = await Order.findById(updatedOrder._id).populate('user course');

    if (status === 'completed' && previousStatus !== 'completed') {
      const userId = order.user?._id || order.user;
      const courseId = order.course?._id || order.course;
      const userEmail = order.user?.email;
      const userFirstName = order.user?.firstName || 'Student';
      const courseTitle = order.course?.title || 'Course';

      if (userId && courseId) {
        const userObj = await User.findById(userId);
        if (userObj) {
          const enrolled = userObj.enrolledCourses ? userObj.enrolledCourses.map(id => id.toString()) : [];
          if (!enrolled.includes(courseId.toString())) {
            enrolled.push(courseId);
            await userService.update(userId, { enrolledCourses: enrolled });
          }
        }
      }

      if (userEmail && courseId) {
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
          const courseWatchLink = `${frontendUrl}/courses/${courseId}`;

          await sendEmail({
            email: userEmail,
            subject: `Payment Approved! Access Your Course: ${courseTitle} - MrHaile.com`,
            message: `Hello ${userFirstName},\n\nYour payment status for "${courseTitle}" has been approved and marked as Completed!\n\nYou can now watch and access your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
          });
        } catch (emailErr) { }
      }
    }
    else if (previousStatus === 'completed' && status !== 'completed') {
      const userId = order.user?._id || order.user;
      const courseId = order.course?._id || order.course;

      if (userId && courseId) {
        const otherCompletedOrder = await Order.findOne({
          _id: { $ne: order._id },
          user: userId,
          course: courseId,
          status: 'completed'
        });

        if (!otherCompletedOrder) {
          const userObj = await User.findById(userId);
          if (userObj && userObj.enrolledCourses) {
            const newEnrolled = userObj.enrolledCourses.filter(id => id.toString() !== courseId.toString());
            await userService.update(userId, { enrolledCourses: newEnrolled });
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Transaction status updated to ${status} successfully`,
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  simulateSuccessfulPayment,
  testEmailDelivery,
  getAdminTransactions,
  updateTransactionStatus
};
