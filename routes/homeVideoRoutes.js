const express = require('express');
const router = express.Router();
const { getHomeVideo, createHomeVideo, updateHomeVideo } = require('../controllers/homeVideoController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getHomeVideo)
  .post(protect, admin, upload.any(), createHomeVideo)
  .put(protect, admin, upload.any(), updateHomeVideo);

module.exports = router;
