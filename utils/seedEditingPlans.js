const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();
const EditingPlan = require('../models/EditingPlan');

const editingPlansData = [
  {
    title: 'STARTER',
    price: 6000,
    billingType: 'per month',
    description: 'For creators who want consistent content. Best for: New creators & small businesses',
    features: [
      '8 Short-form Videos',
      'Basic cuts & transitions',
      'Captions & subtitles',
      'Background music',
      'Basic sound effects',
      'Basic color correction',
      '1 revision per video'
    ],
    isPopular: false,
    isActive: true
  },
  {
    title: 'GROWTH',
    price: 12000,
    billingType: 'per month',
    description: 'For creators who want to grow consistently. Best for: YouTubers & growing creators',
    features: [
      '8 Short-form Videos',
      '1 Long-form Video (15–20 min)',
      'Engaging cuts & transitions',
      'Captions & subtitles',
      'B-roll integration',
      'Sound effects',
      'Audio cleanup',
      'Color correction',
      '2 revisions per video'
    ],
    isPopular: true,
    isActive: true
  },
  {
    title: 'PROFESSIONAL',
    price: 20000,
    billingType: 'per month',
    description: 'For serious creators & personal brands. Best for: Established creators, brands & businesses',
    features: [
      '12 Short-form Videos',
      '2 Long-form Videos (15–20 min)',
      'Advanced editing',
      'Dynamic captions',
      'B-roll & stock footage',
      'Advanced sound design',
      'Color grading',
      'Motion graphics',
      'YouTube-ready formatting',
      '2 revisions per video',
      'Priority delivery'
    ],
    isPopular: false,
    isActive: true
  }
];

const seedEditingPlans = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGO_URI is missing in environment variables.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding editing plans...');

    for (const planData of editingPlansData) {
      const existing = await EditingPlan.findOne({ title: planData.title });
      if (!existing) {
        await EditingPlan.create(planData);
        console.log(`Created editing plan: ${planData.title}`);
      } else {
        await EditingPlan.updateOne({ title: planData.title }, planData);
        console.log(`Updated editing plan: ${planData.title}`);
      }
    }

    console.log('Editing plans seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding editing plans failed:', error);
    process.exit(1);
  }
};

seedEditingPlans();

