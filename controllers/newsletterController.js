const Newsletter = require('../models/Newsletter');
const sendEmail = require('../utils/sendEmail');
const BaseService = require('../services/BaseService');

const newsletterService = new BaseService(Newsletter);

const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const subscribers = await Newsletter.find({ email });
    if (subscribers.length > 0) {
      return res.status(400).json({ message: 'This email is already subscribed to our newsletter!' });
    }

    const subscriber = await newsletterService.create({ email });

    try {
      await sendEmail({
        email,
        subject: 'Welcome to MrHaile.com Newsletter!',
        message: `Hello,\n\nThank you for subscribing to MrHaile.com! You will now receive weekly stock footage drops, free presets, and video editing masterclass tips directly in your inbox.\n\nStay tuned for our latest updates!\n\nBest regards,\nMrHaile.com Team`
      });
    } catch (emailErr) { }

    res.status(201).json({ message: 'Subscribed successfully! Check your email for updates.', subscriber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const broadcastNewsletter = async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Please provide both subject and message for the broadcast' });
    }

    const { data: subscribers } = await newsletterService.getAll({}, 3600, 'all-subscribers');
    if (!subscribers || subscribers.length === 0) {
      return res.status(404).json({ message: 'No newsletter subscribers found' });
    }

    let successCount = 0;
    for (const sub of subscribers) {
      try {
        await sendEmail({
          email: sub.email,
          subject,
          message: `${message}\n\n---\nYou are receiving this email because you subscribed to MrHaile.com.`
        });
        successCount++;
      } catch (err) { }
    }

    res.json({ message: `Broadcast sent successfully to ${successCount} of ${subscribers.length} subscribers!` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSubscribers = async (req, res) => {
  try {
    const { data: subscribers, source } = await newsletterService.getAll({}, 1800, 'all-subscribers');
    res.json({ source, count: subscribers.length, subscribers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { subscribeNewsletter, broadcastNewsletter, getSubscribers };
