const Course = require('../models/Course');
const User = require('../models/User');
const Review = require('../models/Review');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');
const BaseService = require('../services/BaseService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const courseService = new BaseService(Course);

const formatCourseWithStats = async (course, req) => {
  const courseObj = course.toObject ? course.toObject() : course;

  let isEnrolled = false;
  let isAdmin = false;

  if (req && req.user) {
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        isAdmin = user.role === 'admin';
        isEnrolled = user.enrolledCourses && user.enrolledCourses.map(id => id.toString()).includes(courseObj._id.toString());
      }
    } catch (e) { }
  }

  if (courseObj.lessons && Array.isArray(courseObj.lessons)) {
    courseObj.lessons = courseObj.lessons.map(lesson => {
      const canAccess = lesson.freePreview || isEnrolled || isAdmin;
      let playableUrl = '';
      if (canAccess) {
        if (lesson.youtubeUrl && lesson.youtubeUrl.trim() !== '') {
          playableUrl = lesson.youtubeUrl;
        } else if (lesson.bunnyVideoId && lesson.bunnyVideoId.trim() !== '') {
          playableUrl = `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${lesson.bunnyVideoId}`;
        }
      }
      return {
        ...lesson,
        videoUrl: playableUrl
      };
    });
  }

  const enrolledCount = await User.countDocuments({ enrolledCourses: courseObj._id });
  courseObj.enrolledStudentsCount = enrolledCount;

  const reviews = await Review.find({ targetId: courseObj._id });
  courseObj.numReviews = reviews.length;

  if (reviews.length > 0) {
    const sum = reviews.reduce((acc, item) => acc + item.rating, 0);
    courseObj.averageRating = Number((sum / reviews.length).toFixed(1));
  } else {
    courseObj.averageRating = 0.0;
  }

  return courseObj;
};

const getCourses = catchAsync(async (req, res, next) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;

  const { data: courses, source } = await courseService.getAll({ page, limit }, 1800, `page-${page}-limit-${limit}`);

  const total = await Course.countDocuments({});
  const formattedCourses = await Promise.all(courses.map(c => formatCourseWithStats(c, req)));

  res.json({
    source,
    courses: formattedCourses,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

const getCourseById = catchAsync(async (req, res, next) => {
  const { data: course, source } = await courseService.getById(req.params.id, 3600);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const formatted = await formatCourseWithStats(course, req);
  res.json({ source, ...formatted });
});

const createCourse = catchAsync(async (req, res, next) => {
  const { title, description, price, instructor, category } = req.body;
  let thumbnail = req.body.thumbnail || '';
  let lessons = [];

  if (req.body.lessons) {
    lessons = typeof req.body.lessons === 'string'
      ? JSON.parse(req.body.lessons)
      : req.body.lessons;
  } else {
    const lessonMap = {};
    for (const key in req.body) {
      const match = key.match(/^lessons\[(\d+)\]\[(\w+)\]$/);
      if (match) {
        const index = match[1];
        const field = match[2];
        if (!lessonMap[index]) lessonMap[index] = {};
        lessonMap[index][field] = req.body[key];
      }
    }
    lessons = Object.values(lessonMap);
  }

  if (req.files && Array.isArray(req.files)) {
    const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
    if (thumbnailFile && thumbnailFile.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'mrhaile_courses' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(thumbnailFile.buffer);
        });
        if (uploadResult && uploadResult.secure_url) {
          thumbnail = uploadResult.secure_url;
        }
      } catch (err) { }
    }

    const videoFiles = req.files.filter(f => f.fieldname !== 'thumbnail');
    for (let i = 0; i < lessons.length && i < videoFiles.length; i++) {
      const matchedFile = videoFiles[i];
      if (matchedFile && matchedFile.buffer) {
        try {
          const bunnyVideoId = await bunnyConfig.uploadVideo(lessons[i].title, matchedFile.buffer);
          lessons[i].bunnyVideoId = bunnyVideoId;
        } catch (uploadErr) { }
      }
    }
  }

  const courseData = {
    title,
    description,
    price: Number(price) || 0,
    instructor,
    thumbnail,
    category,
    lessons: lessons.map(l => ({
      title: l.title,
      bunnyVideoId: l.bunnyVideoId || '',
      youtubeUrl: l.youtubeUrl || '',
      duration: l.duration || '0:00',
      freePreview: l.freePreview === true || l.freePreview === 'true'
    }))
  };

  const createdCourse = await courseService.create(courseData);
  const formatted = await formatCourseWithStats(createdCourse, req);
  res.status(201).json(formatted);
});

const getLessonVideoToken = catchAsync(async (req, res, next) => {
  const { id: courseId, lessonId } = req.params;

  const { data: course } = await courseService.getById(courseId, 3600);

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  const lesson = course.lessons.id ? course.lessons.id(lessonId) : course.lessons.find(l => l._id.toString() === lessonId);
  if (!lesson) {
    return next(new AppError('Lesson not found', 404));
  }

  if (!lesson.freePreview) {
    if (!req.user) {
      return next(new AppError('Not authorized, please login', 401));
    }

    const user = await User.findById(req.user._id);

    const enrolledIds = user.enrolledCourses ? user.enrolledCourses.map(id => id.toString()) : [];
    const isEnrolled = enrolledIds.includes(courseId.toString());
    const isAdmin = user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return next(new AppError('Access denied. You must purchase or enroll in this course to view this video.', 403));
    }
  }

  let secureVideoUrl = '';
  if (lesson.youtubeUrl && lesson.youtubeUrl.trim() !== '') {
    secureVideoUrl = lesson.youtubeUrl;
  } else if (lesson.bunnyVideoId && lesson.bunnyVideoId.trim() !== '') {
    secureVideoUrl = bunnyConfig.generateEmbedUrl(lesson.bunnyVideoId, 7200);
  }

  res.json({
    title: lesson.title,
    videoUrl: secureVideoUrl,
    duration: lesson.duration,
    freePreview: lesson.freePreview
  });
});

const deleteCourse = catchAsync(async (req, res, next) => {
  const course = await courseService.delete(req.params.id);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  res.json({ message: 'Course removed successfully' });
});

const updateCourse = catchAsync(async (req, res, next) => {
  const { data: existingCourse } = await courseService.getById(req.params.id, 3600);
  if (!existingCourse) {
    return next(new AppError('Course not found', 404));
  }

  const { title, description, price, instructor, category } = req.body;
  const updateData = {};

  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (price !== undefined) updateData.price = Number(price);
  if (instructor) updateData.instructor = instructor;
  if (category) updateData.category = category;

  if (req.body.lessons) {
    try {
      updateData.lessons = typeof req.body.lessons === 'string'
        ? JSON.parse(req.body.lessons)
        : req.body.lessons;
    } catch (e) { }
  }

  if (req.files && Array.isArray(req.files)) {
    const thumbnailFile = req.files.find(f => f.fieldname === 'thumbnail');
    if (thumbnailFile && thumbnailFile.buffer) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'mrhaile_courses' },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(thumbnailFile.buffer);
        });
        if (uploadResult && uploadResult.secure_url) {
          updateData.thumbnail = uploadResult.secure_url;
        }
      } catch (err) { }
    }
  }

  const updatedCourse = await courseService.update(req.params.id, updateData);
  const formatted = await formatCourseWithStats(updatedCourse, req);
  res.json(formatted);
});

module.exports = { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getLessonVideoToken };
