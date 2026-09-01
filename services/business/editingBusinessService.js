const EditingPlan = require('../../models/EditingPlan');
const EditingOrder = require('../../models/EditingOrder');
const { initializeChapaPayment, verifyChapaPayment } = require('../../config/chapa');
const sendEmail = require('../../utils/sendEmail');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class EditingBusinessService {
    constructor() {
        this.planService = new BaseService(EditingPlan);
        this.orderService = new BaseService(EditingOrder);
    }

    async createNewPlan(body) {
        const { title, description, price, billingType, features, image, isActive, isPopular } = body;

        if (!title || !description || price === undefined || !billingType) {
            throw new AppError('Please provide title, description, price, and billingType', 400);
        }

        const plan = await this.planService.create({
            title,
            description,
            price: Number(price),
            billingType,
            features: features || [],
            image: image || '',
            isActive: isActive !== undefined ? isActive : true,
            isPopular: isPopular || false
        });

        return plan;
    }

    async fetchAllPlans(user, queryParam) {
        const filter = user && user.role === 'admin' && queryParam.all === 'true' ? {} : { isActive: true };
        const { data: plans, source } = await this.planService.getAll(filter, 1800, `plans-${JSON.stringify(filter)}`);
        const sorted = [...plans].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return { source, plans: sorted };
    }

    async fetchPlanById(id) {
        const { data: plan, source } = await this.planService.getById(id, 3600);
        if (!plan) {
            throw new AppError('Editing plan not found', 404);
        }
        return { source, plan };
    }

    async updateExistingPlan(id, body) {
        const { data: planObj } = await this.planService.getById(id, 3600);
        if (!planObj) {
            throw new AppError('Editing plan not found', 404);
        }

        const { title, description, price, billingType, features, image, isActive, isPopular } = body;
        const updateData = {};

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = Number(price);
        if (billingType !== undefined) updateData.billingType = billingType;
        if (features !== undefined) updateData.features = features;
        if (image !== undefined) updateData.image = image;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isPopular !== undefined) updateData.isPopular = isPopular;

        const updatedPlan = await this.planService.update(id, updateData);
        return updatedPlan;
    }

    async removePlan(id) {
        const plan = await this.planService.delete(id);
        if (!plan) {
            throw new AppError('Editing plan not found', 404);
        }
        return plan;
    }

    async createNewOrder(body, query, user) {
        const { planId, description, mock } = body;

        if (!planId) {
            throw new AppError('Please provide planId', 400);
        }

        const { data: plan } = await this.planService.getById(planId, 3600);
        if (!plan) {
            throw new AppError('Editing plan not found', 404);
        }

        const tx_ref = `mrhaile-edit-${Date.now()}`;

        const order = await this.orderService.create({
            user: user._id,
            plan: plan._id,
            planTitle: plan.title,
            price: plan.price,
            billingType: plan.billingType,
            description: description || '',
            tx_ref,
            paymentStatus: 'unpaid',
            status: 'pending'
        });

        if (mock === true || query.mock === 'true' || (process.env.NODE_ENV === 'development' && body.skipChapa)) {
            return {
                success: true,
                checkoutUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/editing/success?tx_ref=${tx_ref}`,
                tx_ref,
                order,
                message: 'Order created & payment initialized (Mock Mode)'
            };
        }

        const chapaData = {
            amount: plan.price,
            currency: 'ETB',
            email: user.email,
            first_name: user.name ? user.name.split(' ')[0] : 'Client',
            last_name: user.name ? user.name.split(' ').slice(1).join(' ') : 'User',
            tx_ref,
            callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/editing/success?tx_ref=${tx_ref}`
        };

        const paymentResponse = await initializeChapaPayment(chapaData);

        if (!paymentResponse || !paymentResponse.data || !paymentResponse.data.checkout_url) {
            throw new AppError('Invalid response from payment gateway.', 400);
        }

        return {
            success: true,
            checkoutUrl: paymentResponse.data.checkout_url,
            tx_ref,
            order
        };
    }

    async verifyOrderPayment(params, body, query, path) {
        const tx_ref = params.tx_ref || body.tx_ref;
        if (!tx_ref) {
            throw new AppError('Transaction reference (tx_ref) is required', 400);
        }

        const orders = await EditingOrder.find({ tx_ref }).populate('user', 'name email');
        const order = orders[0];
        if (!order) {
            throw new AppError('Editing order not found', 404);
        }

        if (order.paymentStatus === 'paid') {
            return { success: true, message: 'Payment already verified', order };
        }

        let isSuccess = false;

        if (body.mock === true || query.mock === 'true' || path.includes('simulate-success') || process.env.NODE_ENV === 'development') {
            isSuccess = true;
        } else {
            const verification = await verifyChapaPayment(tx_ref);
            isSuccess =
                verification &&
                (verification.status === 'success' ||
                    verification.status === 'successful' ||
                    verification.data?.status === 'success' ||
                    verification.data?.status === 'successful');
        }

        if (isSuccess) {
            await this.orderService.update(order._id, {
                paymentStatus: 'paid',
                status: 'paid'
            });

            const populatedOrder = await EditingOrder.findById(order._id).populate('user', 'name email');

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

            return {
                success: true,
                message: 'Payment verified successfully. Order updated to paid and admin notified.',
                order: populatedOrder
            };
        }

        await this.orderService.update(order._id, {
            paymentStatus: 'failed',
            status: 'cancelled'
        });

        throw new AppError('Payment verification failed', 400);
    }

    async fetchAllOrders() {
        const { data: orders, source } = await this.orderService.getAll({}, 600, 'all-orders');
        const populatedOrders = await EditingOrder.populate(orders, [
            { path: 'user', select: 'name email' },
            { path: 'plan', select: 'title price billingType' }
        ]);
        return { source, orders: populatedOrders };
    }

    async fetchUserOrders(userId) {
        const { data: orders, source } = await this.orderService.getAll({ user: userId }, 600, `user-orders-${userId}`);
        const populatedOrders = await EditingOrder.populate(orders, [
            { path: 'plan', select: 'title price billingType' }
        ]);
        return { source, orders: populatedOrders };
    }

    async updateOrderStatus(orderId, body) {
        const { status, paymentStatus } = body;
        const validStatuses = ['pending', 'paid', 'in_progress', 'completed', 'cancelled'];

        if (status && !validStatuses.includes(status)) {
            throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
        }

        const { data: orderObj } = await this.orderService.getById(orderId, 600);
        if (!orderObj) {
            throw new AppError('Editing order not found', 404);
        }

        const updateData = {};
        if (status) updateData.status = status;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;

        const updatedOrder = await this.orderService.update(orderId, updateData);
        const populated = await EditingOrder.findById(updatedOrder._id)
            .populate('user', 'name email')
            .populate('plan', 'title price billingType');

        return populated;
    }
}

module.exports = new EditingBusinessService();
