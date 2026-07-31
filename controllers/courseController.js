const Course = require('../models/Course');

// @desc Get all courses
// @route GET /api/courses
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single course by ID
// @route GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (course) {
      res.json(course);
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create a course (Admin)
// @route POST /api/courses
const createCourse = async (req, res) => {
  try {
    const { title, description, price, instructor, thumbnail, category, lessons } = req.body;
    const course = new Course({
      title,
      description,
      price,
      instructor,
      thumbnail,
      category,
      lessons: lessons || []
    });

    const createdCourse = await course.save();
    res.status(201).json(createdCourse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCourses, getCourseById, createCourse };
