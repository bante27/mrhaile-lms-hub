const HomeVideo = require('../models/HomeVideo');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

const formatHomeVideo = (item) => {
  const obj = item.toObject ? item.toObject() : item;
  let videoUrl = '';
  
  if (obj.bunnyVideoId && obj.bunnyVideoId.trim() !== '') {
    // Disable all player controls and icons for clean home page background playback
    videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${obj.bunnyVideoId}?controls=false&autoplay=true&loop=true&muted=true`;
  }

  return {
    _id: obj._id,
    bunnyVideoId: obj.bunnyVideoId || '',
    videoUrl: videoUrl,
    thumbnail: obj.thumbnail || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

// @desc Get single video post for home page
// @route GET /api/home-video
const getHomeVideo = async (req, res) => {
  try {
    let homeVideo = await HomeVideo.findOne();
    if (!homeVideo) {
      homeVideo = await HomeVideo.create({
        bunnyVideoId: '',
        thumbnail: ''
      });
    }
    res.json(formatHomeVideo(homeVideo));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper for handling video and thumbnail uploads to Bunny.net and Cloudinary
const processVideoUpload = async (req) => {
  let finalBunnyId = req.body.bunnyVideoId || '';
  let thumbnail = req.body.thumbnail || '';

  if (req.files && Array.isArray(req.files)) {
    const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
    if (thumbnailFile && thumbnailFile.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'mrhaile_home' },
            (error, result) => (error ? reject(error) : resolve(result))
          );
          uploadStream.end(thumbnailFile.buffer);
        });
        if (uploadResult && uploadResult.secure_url) {
          thumbnail = uploadResult.secure_url;
        }
      } catch (err) {}
    }

    const videoFile = req.files.find(f => f.fieldname === 'video' || f.fieldname === 'homeVideo' || f.fieldname !== 'thumbnail');
    if (videoFile && videoFile.buffer) {
      try {
        const bunnyId = await bunnyConfig.uploadVideo('Home Page Video', videoFile.buffer);
        if (bunnyId) {
          finalBunnyId = bunnyId;
        }
      } catch (uploadErr) {
        console.error('Bunny Stream home video upload error:', uploadErr.message);
      }
    }
  }

  return { finalBunnyId, thumbnail };
};

// @desc Create home page video post (Admin - POST)
// @route POST /api/home-video
const createHomeVideo = async (req, res) => {
  try {
    const { finalBunnyId, thumbnail } = await processVideoUpload(req);

    await HomeVideo.deleteMany({});
    const homeVideo = await HomeVideo.create({
      bunnyVideoId: finalBunnyId,
      thumbnail: thumbnail || ''
    });

    res.status(201).json(formatHomeVideo(homeVideo));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update home page video post (Admin - PUT)
// @route PUT /api/home-video
const updateHomeVideo = async (req, res) => {
  try {
    let homeVideo = await HomeVideo.findOne();
    const { finalBunnyId, thumbnail } = await processVideoUpload(req);

    if (!homeVideo) {
      homeVideo = new HomeVideo({
        bunnyVideoId: finalBunnyId,
        thumbnail: thumbnail || ''
      });
    } else {
      if (finalBunnyId) homeVideo.bunnyVideoId = finalBunnyId;
      if (thumbnail) homeVideo.thumbnail = thumbnail;
    }

    const updated = await homeVideo.save();
    res.json(formatHomeVideo(updated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHomeVideo, createHomeVideo, updateHomeVideo };
