const multer = require('multer');

// Use memory storage so video, image, and PDF buffers can be streamed directly to cloud storage (Bunny.net)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for video/files
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only video, image, and PDF files are allowed!'), false);
    }
  }
});

module.exports = upload;
