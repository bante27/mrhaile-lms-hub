const courseBusinessService = require('../services/business/courseBusinessService');
const catchAsync = require('../utils/catchAsync');

const getCourses = catchAsync(async (req, res, next) => {
  const result = await courseBusinessService.fetchAllCourses(req.query, req);
  res.json(result);
});

const getCourseById = catchAsync(async (req, res, next) => {
  const result = await courseBusinessService.fetchCourseById(req.params.id, req);
  res.json(result);
});

const createCourse = catchAsync(async (req, res, next) => {
  const formatted = await courseBusinessService.createNewCourse(req.body, req.files, req);
  res.status(201).json(formatted);
});

const getLessonVideoToken = catchAsync(async (req, res, next) => {
  const { id: courseId, lessonId } = req.params;
  const result = await courseBusinessService.getLessonToken(courseId, lessonId, req.user);
  res.json(result);
});

const deleteCourse = catchAsync(async (req, res, next) => {
  await courseBusinessService.removeCourse(req.params.id);
  res.json({ message: 'Course removed successfully' });
});

const updateCourse = catchAsync(async (req, res, next) => {
  const formatted = await courseBusinessService.updateExistingCourse(req.params.id, req.body, req.files, req);
  res.json(formatted);
});

module.exports = { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getLessonVideoToken };
