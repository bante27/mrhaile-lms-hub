const express = require('express');
const router = express.Router();
const { getHomeVideo, createHomeVideo, updateHomeVideo } = require('../controllers/homeVideoController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { homeVideoSchema } = require('../validation/homeVideoValidation');

router.route('/')
  .get(getHomeVideo)
  .post(protect, admin, upload.any(), validate(homeVideoSchema), createHomeVideo)
  .put(protect, admin, upload.any(), validate(homeVideoSchema), updateHomeVideo);

module.exports = router;
