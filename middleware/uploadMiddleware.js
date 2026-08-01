const multer = require('multer');

// Use memory storage so video and image buffers can be streamed directly to cloud storage (Bunny.net / Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for video files
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed!'), false);
    }
  }
});

module.exports = upload;
