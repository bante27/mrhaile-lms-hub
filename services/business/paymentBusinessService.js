const Order = require('../../models/Order');
const Course = require('../../models/Course');
const User = require('../../models/User');
const { initializeChapaPayment, verifyChapaPayment } = require('../../config/chapa');
const sendEmail = require('../../utils/sendEmail');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class PaymentBusinessService {
    constructor() {
        this.orderService = new BaseService(Order);
        this.courseService = new BaseService(Course);
        this.userService = new BaseService(User);
    }

    async initializePayment(body, query, user) {
        if (!user || !user._id) {
            throw new AppError('Not authorized, please login first with Bearer token', 401);
        }

        const { courseId, amount } = body;
        if (!courseId) {
            throw new AppError('Please provide courseId in request body', 400);
        }

        const { data: course } = await this.courseService.getById(courseId, 3600);
        if (!course) {
            throw new AppError('Course not found', 404);
        }

        const tx_ref = `mrhaile-${Date.now()}`;

        const order = await this.orderService.create({
            user: user._id,
            course: courseId,
            amount: amount || course.price,
            tx_ref,
            status: 'pending'
        });

        if (body.mock === true || query.mock === 'true') {
            return {
                checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?tx_ref=${tx_ref}`,
                tx_ref,
                message: 'Mock payment initialized successfully'
            };
        }

        const chapaData = {
            amount: order.amount,
            currency: 'ETB',
            email: user.email,
            first_name: user.firstName || 'Student',
            last_name: user.lastName || 'User',
            tx_ref,
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?tx_ref=${tx_ref}`
        };

        const paymentResponse = await initializeChapaPayment(chapaData);

        if (!paymentResponse || !paymentResponse.data || !paymentResponse.data.checkout_url) {
            throw new AppError('Invalid response from Chapa payment gateway. Please check your API keys or Test Mode settings.', 400);
        }

        return {
            checkoutUrl: paymentResponse.data.checkout_url,
            tx_ref
        };
    }

    async verifyPayment(tx_ref) {
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
                    await this.orderService.update(order._id, { status: 'completed' });
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
                            await this.userService.update(userId, { enrolledCourses: enrolled });
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

            return { message: 'Payment verified successfully. Course unlocked and access link sent to email!', status: 'success' };
        }

        throw new AppError('Payment verification failed or pending', 400);
    }

    async simulatePayment(body, query, user) {
        const { tx_ref, courseId } = body;

        let order = null;
        if (tx_ref) {
            const orders = await Order.find({ tx_ref }).populate('user course');
            order = orders[0];
        }

        if (!order) {
            let targetCourseId = courseId;
            if (!targetCourseId) {
                const { data: courses } = await this.courseService.getAll({}, 3600, 'first-course');
                if (!courses || courses.length === 0) {
                    throw new AppError('No courses found in database to simulate enrollment', 404);
                }
                targetCourseId = courses[0]._id;
            }

            const { data: course } = await this.courseService.getById(targetCourseId, 3600);
            order = await this.orderService.create({
                user: user._id,
                course: targetCourseId,
                amount: course ? course.price : 0,
                tx_ref: tx_ref || `mrhaile-sim-${Date.now()}`,
                status: 'completed'
            });
            order = await Order.findById(order._id).populate('user course');
        } else {
            await this.orderService.update(order._id, { status: 'completed' });
        }

        const userId = order.user?._id || order.user;
        const finalCourseId = order.course?._id || order.course;
        const userEmail = order.user?.email || user.email;
        const userFirstName = order.user?.firstName || user.firstName || 'Student';
        const courseTitle = order.course?.title || 'Course';

        if (userId && finalCourseId) {
            const userObj = await User.findById(userId);
            if (userObj) {
                const enrolled = userObj.enrolledCourses ? userObj.enrolledCourses.map(id => id.toString()) : [];
                if (!enrolled.includes(finalCourseId.toString())) {
                    enrolled.push(finalCourseId);
                    await this.userService.update(userId, { enrolledCourses: enrolled });
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

        return {
            message: 'Payment successfully simulated! User enrolled, order marked completed, and email sent.',
            courseWatchLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/courses/${finalCourseId}`,
            enrolledCourseId: finalCourseId
        };
    }

    async testEmail(body, user) {
        const { email, courseTitle } = body;
        const targetEmail = email || user.email;
        const title = courseTitle || 'Advanced Video Editing Masterclass';

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const courseWatchLink = `${frontendUrl}/courses/sample-id`;

        await sendEmail({
            email: targetEmail,
            subject: `[Test] Access Your Course: ${title} - MrHaile.com`,
            message: `Hello ${user.firstName || 'Student'},\n\nThis is a test verification email for "${title}"!\n\nYou can watch your course here:\n${courseWatchLink}\n\nThank you for learning with MrHaile.com!`
        });

        return { message: `Test email successfully sent to ${targetEmail}!` };
    }

    async fetchAdminTransactions() {
        const { data: orders, source } = await this.orderService.getAll({}, 600, 'admin-transactions');
        const populated = await Order.populate(orders, [
            { path: 'user', select: 'firstName lastName email phone' },
            { path: 'course', select: 'title price' }
        ]);
        return { source, orders: populated };
    }

    async updateTransactionStatus(orderId, status) {
        if (!['pending', 'completed', 'failed'].includes(status)) {
            throw new AppError('Invalid status. Must be pending, completed, or failed', 400);
        }

        const { data: orderObj } = await this.orderService.getById(orderId, 600);
        if (!orderObj) {
            throw new AppError('Transaction/Order not found', 404);
        }

        const previousStatus = orderObj.status;
        const updatedOrder = await this.orderService.update(orderId, { status });
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
                        await this.userService.update(userId, { enrolledCourses: enrolled });
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
        } else if (previousStatus === 'completed' && status !== 'completed') {
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
                        await this.userService.update(userId, { enrolledCourses: newEnrolled });
                    }
                }
            }
        }

        return order;
    }
}

module.exports = new PaymentBusinessService();
