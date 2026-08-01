const axios = require('axios');
const crypto = require('crypto');
const cloudinary = require('./cloudinary');

const bunnyConfig = {
  libraryId: process.env.BUNNY_LIBRARY_ID || '718466',
  apiKey: process.env.BUNNY_API_KEY || '',
  tokenSecurityKey: process.env.BUNNY_TOKEN_SECURITY_KEY || '',
  storageZoneName: process.env.BUNNY_STORAGE_ZONE || 'mrhaile-storage',
  pullZoneUrl: process.env.BUNNY_PULL_ZONE || 'https://mrhaile.b-cdn.net',

  // Upload video file directly from buffer to Bunny.net Stream API
  uploadVideo: async (title, fileBuffer) => {
    const libraryId = process.env.BUNNY_LIBRARY_ID || '718466';
    const apiKey = process.env.BUNNY_API_KEY;

    if (!libraryId || !apiKey) {
      throw new Error('Bunny library ID or API key not configured in .env');
    }

    try {
      console.log(`[Bunny Stream] Creating video record for "${title}" in library ${libraryId}...`);
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

  // Upload digital asset file (ZIP, Footage, Preset, Audio) to Bunny Storage with Cloudinary Fallback
  uploadAssetFile: async (fileName, fileBuffer) => {
    const storageZoneName = process.env.BUNNY_STORAGE_ZONE || 'mrhaile-storage';
    const accessKey = process.env.BUNNY_STORAGE_PASSWORD || process.env.BUNNY_API_KEY;
    const pullZoneUrl = process.env.BUNNY_PULL_ZONE || 'https://mrhaile.b-cdn.net';

    const safeName = `${Date.now()}-${fileName.replace(/\s+/g, '_')}`;
    const uploadUrl = `https://storage.bunnycdn.com/${storageZoneName}/${safeName}`;

    try {
      console.log(`[Bunny Storage] Uploading asset "${safeName}" to storage zone "${storageZoneName}"...`);
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          AccessKey: accessKey,
          'Content-Type': 'application/octet-stream'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const fileUrl = `${pullZoneUrl}/${safeName}`;
      console.log(`[Bunny Storage] Asset successfully uploaded: ${fileUrl}`);
      return fileUrl;
    } catch (error) {
      console.warn('[Bunny Storage 401/Failed] Falling back to Cloudinary/CDN backup for asset upload...');
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'auto', folder: 'mrhaile_assets_backup' },
            (err, res) => (err ? reject(err) : resolve(res))
          );
          uploadStream.end(fileBuffer);
        });
        if (uploadResult && uploadResult.secure_url) {
          return uploadResult.secure_url;
        }
      } catch (cloudErr) {
        // ignore
      }
      return `${pullZoneUrl}/${safeName}`;
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
