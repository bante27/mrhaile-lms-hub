const axios = require('axios');
const crypto = require('crypto');

const bunnyConfig = {
  libraryId: process.env.BUNNY_LIBRARY_ID || '718466',
  apiKey: process.env.BUNNY_API_KEY || '',
  tokenSecurityKey: process.env.BUNNY_TOKEN_SECURITY_KEY || '',

  // Upload video file directly from buffer to Bunny.net Stream API
  uploadVideo: async (title, fileBuffer) => {
    const libraryId = process.env.BUNNY_LIBRARY_ID || '718466';
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      throw new Error('Bunny library ID or API key not configured in .env');
    }

    try {
      console.log(`[Bunny Stream] Creating video record for "${title}" in library ${libraryId}...`);
      // Step 1: Create video record in Bunny Stream
      const createRes = await axios.post(
        `https://video.bunnycdn.com/library/${libraryId}/videos`,
        { title },
        {
          headers: {
            AccessKey: apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      const videoId = createRes.data.guid;
      console.log(`[Bunny Stream] Video record created with GUID: ${videoId}. Uploading binary file...`);

      // Step 2: Upload binary video data to Bunny Stream
      await axios.put(
        `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
        fileBuffer,
        {
          headers: {
            AccessKey: apiKey,
            'Content-Type': 'application/octet-stream'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log(`[Bunny Stream] Video successfully uploaded for GUID: ${videoId}`);
      return videoId;
    } catch (error) {
      console.error('[Bunny Stream Upload Error]:', error.response?.data || error.message);
      throw error;
    }
  },

  // Generate secure Bunny Stream embed URL with token expiration and signature
  generateEmbedUrl: (videoId, expirationSeconds = 7200) => {
    const libraryId = process.env.BUNNY_LIBRARY_ID || '718466';
    const tokenKey = process.env.BUNNY_TOKEN_SECURITY_KEY;

    if (!tokenKey) {
      return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
    }

    const expires = Math.floor(Date.now() / 1000) + expirationSeconds;
    const hashable = tokenKey + videoId + expires;
    const token = crypto.createHash('sha256').update(hashable).digest('hex');

    return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;
  }
};

module.exports = bunnyConfig;
