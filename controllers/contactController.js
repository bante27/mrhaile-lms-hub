const ContactMessage = require('../models/ContactMessage');
const sendEmail = require('../utils/sendEmail');

// @desc Submit contact message & send dual email notification (to Admin & Student)
// @route POST /api/contact
const submitContactMessage = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'Please fill in all required fields (Name, Email, Subject, Message)' });
    }

    const contactMsg = await ContactMessage.create({
      name,
      email,
      phone: phone || '',
      subject,
      message
    });

    // 1. Send notification email to Admin (Mr. Haile)
    try {
      const adminEmail = process.env.MAIL_USERNAME || 'admin@mrhaile.com';
      await sendEmail({
        email: adminEmail,
        subject: `[New Contact Message] ${subject} - from ${name}`,
        message: `You received a new message on MrHaile.com:\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nSubject: ${subject}\n\nMessage:\n${message}`
      });
    } catch (adminEmailErr) {
      console.error('Failed to send contact notification to admin:', adminEmailErr.message);
    }

    // 2. Send auto-reply / confirmation email to Student (Sender)
    try {
      await sendEmail({
        email: email,
        subject: `We have received your message! - MrHaile.com`,
        message: `Hello ${name},\n\nThank you for reaching out to MrHaile.com! We have received your message regarding "${subject}" and will get back to you within 24 hours.\n\nFor urgent inquiries, you can also reach us directly on WhatsApp: https://wa.me/251911223344?text=Hello%20Mr.Haile,\n\nBest regards,\nMrHaile.com Team`
      });
    } catch (studentEmailErr) {
      console.error('Failed to send contact auto-reply to student:', studentEmailErr.message);
    }

    res.status(201).json({ message: 'Message sent successfully! We will get back to you soon.', contactMsg });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all contact messages (Admin)
// @route GET /api/contact
const getContactMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find({});
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitContactMessage, getContactMessages };
