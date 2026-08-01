const Course = require('../models/Course');
const User = require('../models/User');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// Helper to attach playable videoUrl to lessons
const formatCourseWithVideos = (course) => {
  const courseObj = course.toObject ? course.toObject() : course;
  if (courseObj.lessons && Array.isArray(courseObj.lessons)) {
    courseObj.lessons = courseObj.lessons.map(lesson => ({
      ...lesson,
      videoUrl: lesson.bunnyVideoId && lesson.bunnyVideoId.trim() !== ''
        ? `https://iframe.mediadelivery.net/embed/${bunnyConfig.libraryId}/${lesson.bunnyVideoId}` 
        : ''
    }));
  }
  return courseObj;
};

// @desc Get all courses
// @route GET /api/courses
const getCourses = async (req, res) => {
  try {
    const courses = await Course.find({});
    const formattedCourses = courses.map(c => formatCourseWithVideos(c));
    res.json(formattedCourses);
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
      res.json(formatCourseWithVideos(course));
    } else {
      res.status(404).json({ message: 'Course not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Create a course with real video uploads to Bunny.net Stream (Admin)
// @route POST /api/courses
const createCourse = async (req, res) => {
  try {
    const { title, description, price, instructor, category } = req.body;
    let thumbnail = req.body.thumbnail || '';
    let lessons = [];

    // Parse lessons from JSON string or individual form-data fields (e.g. lessons[0][title])
    if (req.body.lessons) {
      try {
        lessons = typeof req.body.lessons === 'string' 
          ? JSON.parse(req.body.lessons) 
          : req.body.lessons;
      } catch (e) {
        lessons = [];
      }
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

    // Handle course thumbnail image upload to Cloudinary if file is attached
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
        } catch (err) {
          // Ignore thumbnail upload error or fallback
        }
      }

      // Handle real video uploads for lessons sequentially from any attached video files
      const videoFiles = req.files.filter(f => f.fieldname !== 'thumbnail');
      console.log(`[Course Create] Found ${videoFiles.length} video file(s) attached for ${lessons.length} lesson(s).`);

      for (let i = 0; i < lessons.length && i < videoFiles.length; i++) {
        const matchedFile = videoFiles[i];
        if (matchedFile && matchedFile.buffer) {
          try {
            console.log(`[Course Create] Uploading video file "${matchedFile.originalname}" to Bunny.net for lesson ${i}: "${lessons[i].title}"...`);
            const bunnyVideoId = await bunnyConfig.uploadVideo(lessons[i].title, matchedFile.buffer);
            lessons[i].bunnyVideoId = bunnyVideoId;
            console.log(`[Course Create] Successfully assigned Bunny Video ID ${bunnyVideoId} to lesson ${i}`);
          } catch (uploadErr) {
            console.error(`[Course Create] Bunny video upload failed for lesson ${i}:`, uploadErr.message);
          }
        }
      }
    }

    const course = new Course({
      title,
      description,
      price: Number(price) || 0,
      instructor,
      thumbnail,
      category,
      lessons: lessons.map(l => ({
        title: l.title,
        bunnyVideoId: l.bunnyVideoId || '',
        duration: l.duration || '0:00',
        freePreview: l.freePreview === true || l.freePreview === 'true'
      }))
    });

    const createdCourse = await course.save();
    res.status(201).json(formatCourseWithVideos(createdCourse));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get secure Bunny Stream video URL/Token for a course lesson
// @route GET /api/courses/:id/lessons/:lessonId/video
const getLessonVideoToken = async (req, res) => {
  try {
    const { id: courseId, lessonId } = req.params;
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const lesson = course.lessons.id(lessonId);
    if (!lesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    // Check if lesson is free preview or if user is enrolled/admin
    if (!lesson.freePreview) {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, please login' });
      }

      const user = await User.findById(req.user._id);
      const isEnrolled = user.enrolledCourses && user.enrolledCourses.includes(courseId);
      const isAdmin = user.role === 'admin';

      if (!isEnrolled && !isAdmin) {
        return res.status(403).json({ message: 'Access denied. You must purchase or enroll in this course to view this video.' });
      }
    }

    // Generate secure expiring signed URL for Bunny.net Stream
    const secureVideoUrl = bunnyConfig.generateEmbedUrl(lesson.bunnyVideoId, 7200); // valid for 2 hours

    res.json({
      title: lesson.title,
      videoUrl: secureVideoUrl,
      duration: lesson.duration,
      freePreview: lesson.freePreview
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCourses, getCourseById, createCourse, getLessonVideoToken };
