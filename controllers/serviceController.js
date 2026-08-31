const ServiceInquiry = require('../models/ServiceInquiry');
const sendEmail = require('../utils/sendEmail');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const serviceInquiryService = new BaseService(ServiceInquiry);

const generateSmartEmailHtml = ({ heading, subtitle, contentHtml, callToAction }) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; color: #333333; }
        .email-wrapper { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #eaeaea; }
        .email-header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center; color: #ffffff; }
        .email-header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; color: #38bdf8; }
        .email-header p { margin: 8px 0 0 0; font-size: 14px; color: #94a3b8; }
        .email-body { padding: 35px 30px; background-color: #ffffff; }
        .email-body h2 { font-size: 20px; color: #0f172a; margin-top: 0; margin-bottom: 15px; }
        .email-body p { line-height: 1.6; margin: 0 0 15px 0; font-size: 15px; color: #475569; }
        .highlight-box { background-color: #f8fafc; border-left: 4px solid #38bdf8; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #334155; }
        .btn { display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-top: 20px; text-align: center; box-shadow: 0 4px 12px rgba(56, 189, 248, 0.3); }
        .email-footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #eaeaea; }
        .email-footer a { color: #0284c7; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-header">
          <h1>MrHaile Hub</h1>
          <p>${subtitle || 'Professional Video Editing & Production Studio'}</p>
        </div>
        <div class="email-body">
          <h2>${heading}</h2>
          ${contentHtml}
          ${callToAction ? `<div style="text-align: center;"><a href="${callToAction.url}" class="btn">${callToAction.text}</a></div>` : ''}
        </div>
        <div class="email-footer">
          <p>&copy; ${new Date().getFullYear()} MrHaile Hub. All rights reserved.</p>
          <p>This is an automated communication from <a href="https://mrhaile.com">MrHaile.com</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const submitInquiry = catchAsync(async (req, res, next) => {
  const { name, email, phone, serviceType, budget, message } = req.body;

  const inquiry = await serviceInquiryService.create({
    name,
    email,
    phone: phone || '',
    serviceType,
    budget: budget || '',
    message
  });

  try {
    const adminEmail = process.env.MAIL_USERNAME || process.env.ADMIN_EMAIL || 'admin@mrhaile.com';
    const adminHtml = generateSmartEmailHtml({
      heading: 'New Custom Editing Quote Request',
      subtitle: 'New Client Inquiry Received',
      contentHtml: `
        <p>Hello Admin,</p>
        <p>You have received a new custom editing quote request from <strong>${name}</strong>.</p>
        <div class="highlight-box">
          <strong>Client Name:</strong> ${name}<br>
          <strong>Email:</strong> ${email}<br>
          <strong>Phone:</strong> ${phone || 'N/A'}<br>
          <strong>Service Type:</strong> ${serviceType}<br>
          <strong>Estimated Budget:</strong> ${budget || 'N/A'}
        </div>
        <p><strong>Project Details & Footage Link:</strong></p>
        <p style="white-space: pre-wrap; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0;">${message}</p>
      `,
      callToAction: {
        url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/admin/inquiries`,
        text: 'View Inquiries Dashboard'
      }
    });

    await sendEmail({
      email: adminEmail,
      subject: `New Custom Editing Quote Request: ${serviceType} from ${name}`,
      message: `You have received a new custom editing quote request.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nService Type: ${serviceType}\nEstimated Budget: ${budget || 'N/A'}\n\nProject Details & Footage Link:\n${message}`,
      html: adminHtml
    });
  } catch (emailErr) { }

  try {
    const clientHtml = generateSmartEmailHtml({
      heading: 'We Have Received Your Quote Request!',
      subtitle: 'Thank you for choosing MrHaile Hub',
      contentHtml: `
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for reaching out to MrHaile Hub for your <strong>${serviceType}</strong> project!</p>
        <p>Our production team is currently reviewing your project details and estimated budget. We will get back to you within 24 hours with a custom quote and next steps.</p>
        <div class="highlight-box">
          <strong>Summary of your inquiry:</strong><br>
          - Service: ${serviceType}<br>
          - Budget: ${budget || 'Flexible / Not specified'}<br>
          - Status: Pending Review
        </div>
        <p>If you have any additional footage links or reference files to share in the meantime, feel free to reply directly to this email.</p>
      `,
      callToAction: {
        url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/services`,
        text: 'Explore Our Services'
      }
    });

    await sendEmail({
      email: email,
      subject: `We've received your inquiry: ${serviceType} - MrHaile Hub`,
      message: `Hello ${name},\n\nThank you for reaching out to MrHaile Hub for your ${serviceType} project! We have received your inquiry and will get back to you within 24 hours.\n\nBest regards,\nMrHaile Hub Team`,
      html: clientHtml
    });
  } catch (clientEmailErr) { }

  res.status(201).json({ message: 'Quote request submitted successfully', inquiry });
});

const getInquiries = catchAsync(async (req, res, next) => {
  const { data: inquiries, source } = await serviceInquiryService.getAll({}, 600, 'all-inquiries');
  const sorted = [...inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ source, inquiries: sorted });
});

const replyInquiry = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { replyMessage, status } = req.body;

  const { data: inquiryObj } = await serviceInquiryService.getById(id, 600);
  if (!inquiryObj) {
    return next(new AppError('Service inquiry not found', 404));
  }

  const updateData = {
    adminReply: replyMessage,
    repliedAt: Date.now(),
    status: status || 'contacted'
  };

  const updatedInquiry = await serviceInquiryService.update(id, updateData);

  const clientReplyHtml = generateSmartEmailHtml({
    heading: `Update on Your Inquiry: ${updatedInquiry.serviceType}`,
    subtitle: 'Response from MrHaile Hub Team',
    contentHtml: `
      <p>Hello <strong>${updatedInquiry.name}</strong>,</p>
      <p>We have an update regarding your custom editing quote request for <strong>${updatedInquiry.serviceType}</strong>:</p>
      <div class="highlight-box" style="border-left-color: #0284c7; background: #f0f9ff;">
        <strong>Admin Response:</strong><br><br>
        <span style="white-space: pre-wrap; color: #0f172a;">${replyMessage}</span>
      </div>
      <p>If you have any questions or would like to proceed with the project proposal, please reply to this email or contact us directly.</p>
    `,
    callToAction: {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/contact`,
      text: 'Contact Us'
    }
  });

  try {
    await sendEmail({
      email: updatedInquiry.email,
      subject: `Response regarding your quote request (${updatedInquiry.serviceType}) - MrHaile Hub`,
      message: `Hello ${updatedInquiry.name},\n\nWe have an update regarding your quote request for ${updatedInquiry.serviceType}:\n\n${replyMessage}\n\nBest regards,\nMrHaile Hub Team`,
      html: clientReplyHtml
    });
  } catch (emailError) {
    return next(new AppError(`Inquiry saved, but failed to send email to client: ${emailError.message}`, 500));
  }

  res.json({
    message: 'Reply sent successfully to client email',
    inquiry: updatedInquiry
  });
});

const getInquiryById = catchAsync(async (req, res, next) => {
  const { data: inquiry, source } = await serviceInquiryService.getById(req.params.id, 600);
  if (!inquiry) {
    return next(new AppError('Service inquiry not found', 404));
  }
  res.json({ source, ...inquiry.toObject ? inquiry.toObject() : inquiry });
});

const getMyInquiries = catchAsync(async (req, res, next) => {
  const { data: inquiries, source } = await serviceInquiryService.getAll({ user: req.user._id }, 600, `my-inquiries-${req.user._id}`);
  const sorted = [...inquiries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.status(200).json({
    success: true,
    source,
    inquiries: sorted
  });
});

module.exports = { submitInquiry, getInquiries, getInquiryById, getMyInquiries, replyInquiry };
