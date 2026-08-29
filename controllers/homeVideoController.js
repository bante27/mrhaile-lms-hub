const HomeVideo = require('../models/HomeVideo');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');
const BaseService = require('../services/BaseService');

const homeVideoService = new BaseService(HomeVideo);

const formatHomeVideo = (item) => {
  const obj = item.toObject ? item.toObject() : item;
  let videoUrl = '';
  
  if (obj.bunnyVideoId && obj.bunnyVideoId.trim() !== '') {
    videoUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${obj.bunnyVideoId}?controls=false&autoplay=true&loop=true&muted=true`;
  }

  return {
    _id: obj._id,
    bunnyVideoId: obj.bunnyVideoId || '',
    youtubeUrl: obj.youtubeUrl || '',
    youtubeUrl2: obj.youtubeUrl2 || '',
    videoUrl: videoUrl,
    thumbnail: obj.thumbnail || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt
  };
};

const getHomeVideo = async (req, res) => {
  try {
    const { data: videos, source } = await homeVideoService.getAll({}, 3600, 'home-video-post');
    let homeVideo = videos && videos.length > 0 ? videos[0] : null;

    if (!homeVideo) {
      homeVideo = await homeVideoService.create({
        bunnyVideoId: '',
        youtubeUrl: '',
        youtubeUrl2: '',
        thumbnail: ''
      });
    }

    res.json({ source, ...formatHomeVideo(homeVideo) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const processVideoUpload = async (req) => {
  let finalBunnyId = req.body.bunnyVideoId || '';
  let thumbnail = req.body.thumbnail || '';
  let youtubeUrl = req.body.youtubeUrl || '';
  let youtubeUrl2 = req.body.youtubeUrl2 || '';

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
      } catch (uploadErr) {}
    }
  }

  return { finalBunnyId, thumbnail, youtubeUrl, youtubeUrl2 };
};

const createHomeVideo = async (req, res) => {
  try {
    const { finalBunnyId, thumbnail, youtubeUrl, youtubeUrl2 } = await processVideoUpload(req);

    await HomeVideo.deleteMany({});
    const homeVideo = await homeVideoService.create({
      bunnyVideoId: finalBunnyId,
      youtubeUrl: youtubeUrl || req.body.youtubeUrl || '',
      youtubeUrl2: youtubeUrl2 || req.body.youtubeUrl2 || '',
      thumbnail: thumbnail || ''
    });

    res.status(201).json(formatHomeVideo(homeVideo));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateHomeVideo = async (req, res) => {
  try {
    const { data: videos } = await homeVideoService.getAll({}, 3600, 'home-video-post');
    let homeVideo = videos && videos.length > 0 ? videos[0] : null;
    const { finalBunnyId, thumbnail, youtubeUrl, youtubeUrl2 } = await processVideoUpload(req);

    if (!homeVideo) {
      const created = await homeVideoService.create({
        bunnyVideoId: finalBunnyId,
        youtubeUrl: youtubeUrl || req.body.youtubeUrl || '',
        youtubeUrl2: youtubeUrl2 || req.body.youtubeUrl2 || '',
        thumbnail: thumbnail || ''
      });
      return res.json(formatHomeVideo(created));
    }

    const updateData = {};
    if (finalBunnyId !== undefined) updateData.bunnyVideoId = finalBunnyId;
    if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
    else if (req.body.youtubeUrl !== undefined) updateData.youtubeUrl = req.body.youtubeUrl;
    if (youtubeUrl2 !== undefined) updateData.youtubeUrl2 = youtubeUrl2;
    else if (req.body.youtubeUrl2 !== undefined) updateData.youtubeUrl2 = req.body.youtubeUrl2;
    if (thumbnail) updateData.thumbnail = thumbnail;

    const updated = await homeVideoService.update(homeVideo._id, updateData);
    res.json(formatHomeVideo(updated));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getHomeVideo, createHomeVideo, updateHomeVideo };
