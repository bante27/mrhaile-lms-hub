const Newsletter = require('../models/Newsletter');
const sendEmail = require('../utils/sendEmail');

// @desc Subscribe to newsletter ("STAY UPDATED" form)
// @route POST /api/newsletter/subscribe
const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const existingSubscriber = await Newsletter.findOne({ email });
    if (existingSubscriber) {
      return res.status(400).json({ message: 'This email is already subscribed to our newsletter!' });
    }

    const subscriber = await Newsletter.create({ email });

    // Send welcome email to subscriber
    try {
      await sendEmail({
        email,
        subject: 'Welcome to MrHaile.com Newsletter!',
        message: `Hello,\n\nThank you for subscribing to MrHaile.com! You will now receive weekly stock footage drops, free presets, and video editing masterclass tips directly in your inbox.\n\nStay tuned for our latest updates!\n\nBest regards,\nMrHaile.com Team`
      });
    } catch (emailErr) {
      console.error('Failed to send newsletter welcome email:', emailErr.message);
    }

    res.status(201).json({ message: 'Subscribed successfully! Check your email for updates.', subscriber });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Broadcast notification update to all subscribers (Admin)
// @route POST /api/newsletter/broadcast
const broadcastNewsletter = async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: 'Please provide both subject and message for the broadcast' });
    }

    const subscribers = await Newsletter.find({});
    if (subscribers.length === 0) {
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
      } catch (err) {
        console.error(`Failed to send email to ${sub.email}:`, err.message);
      }
    }

    res.json({ message: `Broadcast sent successfully to ${successCount} of ${subscribers.length} subscribers!` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get all subscribers (Admin)
// @route GET /api/newsletter/subscribers
const getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find({});
    res.json({ count: subscribers.length, subscribers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { subscribeNewsletter, broadcastNewsletter, getSubscribers };
