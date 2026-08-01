const express = require('express');
const router = express.Router();
const { 
  getCourses, 
  getCourseById, 
  createCourse, 
  getLessonVideoToken 
} = require('../controllers/courseController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getCourses)
  .post(
    protect, 
    admin, 
    upload.any(), 
    createCourse
  );

router.route('/:id').get(getCourseById);
router.route('/:id/lessons/:lessonId/video').get(protect, getLessonVideoToken);

module.exports = router;
