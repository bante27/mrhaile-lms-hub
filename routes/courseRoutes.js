const express = require('express');
const router = express.Router();
const { getCourses, getCourseById, createCourse } = require('../controllers/courseController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getCourses).post(protect, admin, createCourse);
router.route('/:id').get(getCourseById);

module.exports = router;
