const Course = require('../models/Course');
const User = require('../models/User');
const Review = require('../models/Review');
const bunnyConfig = require('../config/bunny');
const cloudinary = require('../config/cloudinary');

// Helper to attach playable videoUrl (with Free Preview & Paid Lock/Pause logic) and exact dynamic stats
const formatCourseWithStats = async (course, req) => {
  const courseObj = course.toObject ? course.toObject() : course;

  let isEnrolled = false;
  let isAdmin = false;

  // Check if requesting user is logged in and enrolled or admin
  if (req && req.user) {
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        isAdmin = user.role === 'admin';
        isEnrolled = user.enrolledCourses && user.enrolledCourses.map(id => id.toString()).includes(courseObj._id.toString());
      }
    } catch (e) {
      // ignore user lookup error
    }
  }

  // Format lessons with YouTube or Bunny video URL (Lock/Pause if paid and user not enrolled/admin)
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
        videoUrl: playableUrl // Locked / Paused for unpaid users, or YouTube / Bunny URL
      };
    });
  }

  // Exact Enrolled Students Count from Database
  const enrolledCount = await User.countDocuments({ enrolledCourses: courseObj._id });
  courseObj.enrolledStudentsCount = enrolledCount;

  // Exact Ratings & Reviews from Database
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

// @desc Get all courses with smart lock/pause access logic & pagination (12 per page)
// @route GET /api/courses?page=1&limit=12
const getCourses = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const total = await Course.countDocuments({});
    const courses = await Course.find({}).skip(skip).limit(limit);
    const formattedCourses = await Promise.all(courses.map(c => formatCourseWithStats(c, req)));

    res.json({
      courses: formattedCourses,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Get single course by ID with smart lock/pause access logic
// @route GET /api/courses/:id
const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (course) {
      const formatted = await formatCourseWithStats(course, req);
      res.json(formatted);
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
      for (let i = 0; i < lessons.length && i < videoFiles.length; i++) {
        const matchedFile = videoFiles[i];
        if (matchedFile && matchedFile.buffer) {
          try {
            const bunnyVideoId = await bunnyConfig.uploadVideo(lessons[i].title, matchedFile.buffer);
            lessons[i].bunnyVideoId = bunnyVideoId;
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
        youtubeUrl: l.youtubeUrl || '',
        duration: l.duration || '0:00',
        freePreview: l.freePreview === true || l.freePreview === 'true'
      }))
    });

    const createdCourse = await course.save();
    const formatted = await formatCourseWithStats(createdCourse, req);
    res.status(201).json(formatted);
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
      
      // FIXED: Convert ObjectIDs to strings for proper comparison
      const enrolledIds = user.enrolledCourses ? user.enrolledCourses.map(id => id.toString()) : [];
      const isEnrolled = enrolledIds.includes(courseId.toString());
      const isAdmin = user.role === 'admin';

      if (!isEnrolled && !isAdmin) {
        return res.status(403).json({ message: 'Access denied. You must purchase or enroll in this course to view this video.' });
      }
    }

    // Generate secure expiring signed URL for Bunny.net Stream or use YouTube URL
    let secureVideoUrl = '';
    if (lesson.youtubeUrl && lesson.youtubeUrl.trim() !== '') {
      secureVideoUrl = lesson.youtubeUrl;
    } else if (lesson.bunnyVideoId && lesson.bunnyVideoId.trim() !== '') {
      secureVideoUrl = bunnyConfig.generateEmbedUrl(lesson.bunnyVideoId, 7200); // valid for 2 hours
    }

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

// @desc Delete a course by ID (Admin)
// @route DELETE /api/courses/:id
const deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    await course.deleteOne();
    res.json({ message: 'Course removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update a course by ID (Admin)
// @route PUT /api/courses/:id
const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { title, description, price, instructor, category } = req.body;
    
    if (title) course.title = title;
    if (description) course.description = description;
    if (price !== undefined) course.price = Number(price);
    if (instructor) course.instructor = instructor;
    if (category) course.category = category;

    if (req.body.lessons) {
      try {
        course.lessons = typeof req.body.lessons === 'string' 
          ? JSON.parse(req.body.lessons) 
          : req.body.lessons;
      } catch (e) {}
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
            course.thumbnail = uploadResult.secure_url;
          }
        } catch (err) {}
      }
    }

    const updatedCourse = await course.save();
    const formatted = await formatCourseWithStats(updatedCourse, req);
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCourses, getCourseById, createCourse, updateCourse, deleteCourse, getLessonVideoToken };

