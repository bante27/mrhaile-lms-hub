const ServiceInquiry = require('../models/ServiceInquiry');
const sendEmail = require('../utils/sendEmail');

// @desc Submit video editing / portfolio service inquiry
// @route POST /api/services/inquiry
const submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, serviceType, message } = req.body;

    const inquiry = await ServiceInquiry.create({
      name,
      email,
      phone,
      serviceType,
      message
    });

    // Send notification email to admin
    await sendEmail({
      email: process.env.ADMIN_EMAIL || 'admin@mrhaile.com',
      subject: `New Service Inquiry: ${serviceType} from ${name}`,
      message: `You have a new inquiry.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${serviceType}\nMessage: ${message}`
    });

    res.status(201).json({ message: 'Inquiry submitted successfully', inquiry });
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
