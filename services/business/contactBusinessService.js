const ContactMessage = require('../../models/ContactMessage');
const sendEmail = require('../../utils/sendEmail');
const BaseService = require('../../services/BaseService');

class ContactBusinessService extends BaseService {
    constructor() {
        super(ContactMessage);
    }

    async submitMessage(body) {
        const { name, email, phone, subject, message } = body;
        const resolvedSubject = subject || 'General Inquiry';

        const contactMsg = await super.create({
            name,
            email,
            phone: phone || '',
            subject: resolvedSubject,
            message
        });

        const adminEmail = process.env.MAIL_USERNAME || 'admin@mrhaile.com';
        await sendEmail({
            email: adminEmail,
            subject: `[New Contact Message] ${resolvedSubject} - from ${name}`,
            message: `You received a new message on MrHaile.com:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nSubject: ${resolvedSubject}\n\nMessage:\n${message}`
        });

        await sendEmail({
            email: email,
            subject: `We have received your message! - MrHaile.com`,
            message: `Hello ${name},\n\nThank you for reaching out to MrHaile.com! We have received your message regarding "${resolvedSubject}" and will get back to you within 24 hours.\n\nFor urgent inquiries, you can also reach us directly on WhatsApp: https://wa.me/251911223344?text=Hello%20Mr.Haile,\n\nBest regards,\nMrHaile.com Team`
        });

        return contactMsg;
    }

    async fetchContactMessages() {
        const { data: messages, source } = await super.getAll({}, 600, 'all-contact-messages');
        const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return { source, messages: sorted };
    }
}

module.exports = new ContactBusinessService();
