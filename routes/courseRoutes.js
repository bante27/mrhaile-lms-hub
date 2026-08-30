const express = require('express');
const router = express.Router();
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getLessonVideoToken
} = require('../controllers/courseController');
const { protect, admin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createCourseSchema, updateCourseSchema, courseIdSchema } = require('../validation/courseValidation');

router.route('/')
  .get(getCourses)
  .post(
    protect,
    admin,
    upload.any(),
    validate(createCourseSchema),
    createCourse
  );

router.route('/:id')
  .get(validate(courseIdSchema), getCourseById)
  .put(protect, admin, upload.any(), validate(updateCourseSchema), updateCourse)
  .delete(protect, admin, validate(courseIdSchema), deleteCourse);

router.route('/:id/lessons/:lessonId/video').get(protect, getLessonVideoToken);

module.exports = router;


