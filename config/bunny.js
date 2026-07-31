// Bunny CDN configuration helper for video streaming / asset storage
const axios = require('axios');

const bunnyConfig = {
  apiKey: process.env.BUNNY_API_KEY || '',
  storageZoneName: process.env.BUNNY_STORAGE_ZONE || '',
  region: process.env.BUNNY_REGION || 'ny', // e.g., ny, de, sg
  pullZoneUrl: process.env.BUNNY_PULL_ZONE || ''
};

module.exports = bunnyConfig;
