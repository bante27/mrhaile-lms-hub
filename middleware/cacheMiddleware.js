const cache = require('../utils/redis');

/**
 * Senior-level Cache Middleware Factory
 * Automatically caches GET responses in Redis for the specified duration.
 * 
 * @param {number} ttlSeconds - Time-to-live in seconds (e.g. 300 for 5 minutes)
 * @param {function} keyGenerator - Optional custom function to generate cache key from req
 */
const cacheMiddleware = (ttlSeconds = 300, keyGenerator = null) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate unique cache key
        const cacheKey = keyGenerator
            ? keyGenerator(req)
            : `cache:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await cache.get(cacheKey);

            if (cachedResponse) {
                // Cache hit! Return data directly with a custom header for debugging/monitoring
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(cachedResponse);
            }

            // Cache miss: Intercept res.json to store the response in Redis before sending to client
            res.setHeader('X-Cache', 'MISS');
            const originalJson = res.json.bind(res);

            res.json = async (body) => {
                // Only cache successful responses (HTTP 200)
                if (res.statusCode === 200 && body) {
                    // Asynchronously set cache without blocking response delivery
                    cache.set(cacheKey, body, ttlSeconds).catch((err) => {
                        console.error('Cache set background error:', err.message);
                    });
                }
                return originalJson(body);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error.message);
            next(); // Fail gracefully: proceed to controller without caching if Redis errors out
        }
    };
};

module.exports = cacheMiddleware;
