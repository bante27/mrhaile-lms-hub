const Newsletter = require('../../models/Newsletter');
const sendEmail = require('../../utils/sendEmail');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class NewsletterBusinessService extends BaseService {
    constructor() {
        super(Newsletter);
    }

    async subscribe(email) {
        const subscribers = await Newsletter.find({ email });
        if (subscribers.length > 0) {
            throw new AppError('This email is already subscribed to our newsletter!', 400);
        }

        const subscriber = await super.create({ email });

        await sendEmail({
            email,
            subject: 'Welcome to MrHaile.com Newsletter!',
            message: `Hello,\n\nThank you for subscribing to MrHaile.com! You will now receive weekly stock footage drops, free presets, and video editing masterclass tips directly in your inbox.\n\nStay tuned for our latest updates!\n\nBest regards,\nMrHaile.com Team`
        });

        return subscriber;
    }

    async broadcast(subject, message) {
        const { data: subscribers } = await super.getAll({}, 3600, 'all-subscribers');
        if (!subscribers || subscribers.length === 0) {
            throw new AppError('No newsletter subscribers found', 404);
        }

        let successCount = 0;
        for (const sub of subscribers) {
            await sendEmail({
                email: sub.email,
                subject,
                message: `${message}\n\n---\nYou are receiving this email because you subscribed to MrHaile.com.`
            });
            successCount++;
        }

        return { successCount, total: subscribers.length };
    }

    async fetchSubscribers() {
        const { data: subscribers, source } = await super.getAll({}, 1800, 'all-subscribers');
        return { source, count: subscribers.length, subscribers };
    }
}

module.exports = new NewsletterBusinessService();
