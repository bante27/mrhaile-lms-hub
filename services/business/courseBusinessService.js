const Course = require('../../models/Course');
const User = require('../../models/User');
const Review = require('../../models/Review');
const bunnyConfig = require('../../config/bunny');
const cloudinary = require('../../config/cloudinary');
const BaseService = require('../../services/BaseService');
const AppError = require('../../utils/appError');

class CourseService extends BaseService {
  constructor() {
    super(Course);
  }

  async formatCourseWithStats(course, req) {
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
  }

  async fetchAllCourses(query, req) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 12;

    const { data: courses, source } = await super.getAll({ page, limit }, 1800, `page-${page}-limit-${limit}`);
    const total = await Course.countDocuments({});
    const formattedCourses = await Promise.all(courses.map(c => this.formatCourseWithStats(c, req)));

    return {
      source,
      courses: formattedCourses,
      page,
      pages: Math.ceil(total / limit),
      total
    };
  }

  async fetchCourseById(id, req) {
    const { data: course, source } = await super.getById(id, 3600);
    if (!course) {
      throw new AppError('Course not found', 404);
    }
    const formatted = await this.formatCourseWithStats(course, req);
    return { source, ...formatted };
  }

  async createNewCourse(body, files, req) {
    const { title, description, price, instructor, category } = body;
    let thumbnail = body.thumbnail || '';
    let lessons = [];

    if (body.lessons) {
      lessons = typeof body.lessons === 'string'
        ? JSON.parse(body.lessons)
        : body.lessons;
    } else {
      const lessonMap = {};
      for (const key in body) {
        const match = key.match(/^lessons\[(\d+)\]\[(\w+)\]$/);
        if (match) {
          const index = match[1];
          const field = match[2];
          if (!lessonMap[index]) lessonMap[index] = {};
          lessonMap[index][field] = body[key];
        }
      }
      lessons = Object.values(lessonMap);
    }

    if (files && Array.isArray(files)) {
      const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
      if (thumbnailFile && thumbnailFile.buffer) {
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
      }

      const videoFiles = files.filter(f => f.fieldname !== 'thumbnail');
      for (let i = 0; i < lessons.length && i < videoFiles.length; i++) {
        const matchedFile = videoFiles[i];
        if (matchedFile && matchedFile.buffer) {
          const bunnyVideoId = await bunnyConfig.uploadVideo(lessons[i].title, matchedFile.buffer);
          lessons[i].bunnyVideoId = bunnyVideoId;
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

    const createdCourse = await super.create(courseData);
    return await this.formatCourseWithStats(createdCourse, req);
  }

  async updateExistingCourse(id, body, files, req) {
    const { data: existingCourse } = await super.getById(id, 3600);
    if (!existingCourse) {
      throw new AppError('Course not found', 404);
    }

    const { title, description, price, instructor, category } = body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price !== undefined) updateData.price = Number(price);
    if (instructor) updateData.instructor = instructor;
    if (category) updateData.category = category;

    if (body.lessons) {
      updateData.lessons = typeof body.lessons === 'string'
        ? JSON.parse(body.lessons)
        : body.lessons;
    }

    if (files && Array.isArray(files)) {
      const thumbnailFile = files.find(f => f.fieldname === 'thumbnail');
      if (thumbnailFile && thumbnailFile.buffer) {
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
      }
    }

    const updatedCourse = await super.update(id, updateData);
    return await this.formatCourseWithStats(updatedCourse, req);
  }

  async removeCourse(id) {
    const course = await super.delete(id);
    if (!course) {
      throw new AppError('Course not found', 404);
    }
    return course;
  }

  async getLessonToken(courseId, lessonId, user) {
    const { data: course } = await super.getById(courseId, 3600);
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    const lesson = course.lessons.id ? course.lessons.id(lessonId) : course.lessons.find(l => l._id.toString() === lessonId);
    if (!lesson) {
      throw new AppError('Lesson not found', 404);
    }

    if (!lesson.freePreview) {
      if (!user) {
        throw new AppError('Not authorized, please login', 401);
      }

      const dbUser = await User.findById(user._id);
      const enrolledIds = dbUser.enrolledCourses ? dbUser.enrolledCourses.map(id => id.toString()) : [];
      const isEnrolled = enrolledIds.includes(courseId.toString());
      const isAdmin = dbUser.role === 'admin';

      if (!isEnrolled && !isAdmin) {
        throw new AppError('Access denied. You must purchase or enroll in this course to view this video.', 403);
      }
    }

    let secureVideoUrl = '';
    if (lesson.youtubeUrl && lesson.youtubeUrl.trim() !== '') {
      secureVideoUrl = lesson.youtubeUrl;
    } else if (lesson.bunnyVideoId && lesson.bunnyVideoId.trim() !== '') {
      secureVideoUrl = bunnyConfig.generateEmbedUrl(lesson.bunnyVideoId, 7200);
    }

    return {
      title: lesson.title,
      videoUrl: secureVideoUrl,
      duration: lesson.duration,
      freePreview: lesson.freePreview
    };
  }
}

module.exports = new CourseService();
