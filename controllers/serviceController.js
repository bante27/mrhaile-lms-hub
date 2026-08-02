const ServiceInquiry = require('../models/ServiceInquiry');
const sendEmail = require('../utils/sendEmail');

// @desc Submit video editing / custom quote service inquiry
// @route POST /api/services/inquiry
const submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, serviceType, budget, message } = req.body;

    if (!name || !email || !serviceType || !message) {
      return res.status(400).json({ message: 'Please fill in all required fields (Name, Email, Service Type, Project Details)' });
    }

    const inquiry = await ServiceInquiry.create({
      name,
      email,
      phone: phone || '',
      serviceType,
      budget: budget || '',
      message
    });

    // Send notification email to admin
    try {
      await sendEmail({
        email: process.env.MAIL_USERNAME || 'admin@mrhaile.com',
        subject: `New Custom Editing Quote Request: ${serviceType} from ${name}`,
        message: `You have received a new custom editing quote request.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nService Type: ${serviceType}\nEstimated Budget: ${budget || 'N/A'}\n\nProject Details & Footage Link:\n${message}`
      });
    } catch (emailErr) {
      console.error('Failed to send inquiry email notification:', emailErr.message);
    }

    res.status(201).json({ message: 'Quote request submitted successfully', inquiry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all service inquiries (Admin)
// @route GET /api/services/inquiries
const getInquiries = async (req, res) => {
  try {
    const inquiries = await ServiceInquiry.find({});
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitInquiry, getInquiries };
