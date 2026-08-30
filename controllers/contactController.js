const ContactMessage = require('../models/ContactMessage');
const sendEmail = require('../utils/sendEmail');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const contactService = new BaseService(ContactMessage);

const submitContactMessage = catchAsync(async (req, res, next) => {
  const { name, email, phone, subject, message } = req.body;

  const resolvedSubject = subject || 'General Inquiry';

  const contactMsg = await contactService.create({
    name,
    email,
    phone: phone || '',
    subject: resolvedSubject,
    message
  });

  try {
    const adminEmail = process.env.MAIL_USERNAME || 'admin@mrhaile.com';
    await sendEmail({
      email: adminEmail,
      subject: `[New Contact Message] ${resolvedSubject} - from ${name}`,
      message: `You received a new message on MrHaile.com:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nSubject: ${resolvedSubject}\n\nMessage:\n${message}`
    });
  } catch (adminEmailErr) { }

  try {
    await sendEmail({
      email: email,
      subject: `We have received your message! - MrHaile.com`,
      message: `Hello ${name},\n\nThank you for reaching out to MrHaile.com! We have received your message regarding "${resolvedSubject}" and will get back to you within 24 hours.\n\nFor urgent inquiries, you can also reach us directly on WhatsApp: https://wa.me/251911223344?text=Hello%20Mr.Haile,\n\nBest regards,\nMrHaile.com Team`
    });
  } catch (studentEmailErr) { }

  res.status(201).json({ message: 'Message sent successfully! We will get back to you soon.', contactMsg });
});

const getContactMessages = catchAsync(async (req, res, next) => {
  const { data: messages, source } = await contactService.getAll({}, 600, 'all-contact-messages');
  const sorted = [...messages].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ source, messages: sorted });
});

module.exports = { submitContactMessage, getContactMessages };
