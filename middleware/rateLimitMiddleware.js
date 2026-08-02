// Simple, zero-dependency in-memory rate limiter middleware
const rateLimit = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
  const max = options.max || 100; // limit each IP to 100 requests per windowMs
  const message = options.message || { message: 'Too many requests, please try again later.' };

  const hits = new Map();

  // Cleanup old entries every windowMs
  setInterval(() => {
    hits.clear();
  }, windowMs);

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const current = hits.get(ip) || 0;

    if (current >= max) {
      return res.status(429).json(message);
    }

    hits.set(ip, current + 1);
    next();
  };
};

module.exports = rateLimit;
