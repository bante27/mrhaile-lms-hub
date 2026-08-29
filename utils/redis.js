const { createClient } = require('redis');

// Initialize Redis client using IPv4 explicitly to avoid IPv6 (::1) ECONNREFUSED issues on Windows
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    connectTimeout: 1000,
    reconnectStrategy: false // Do not auto-reconnect if local Redis isn't running to keep console clean
  }
});

// Suppress unhandled error crash when Redis is offline
redisClient.on('error', (err) => {
  // Silently ignore connection refused errors so they don't crash the server or spam logs
});

redisClient.on('connect', () => {
  console.log('🔄 Redis client connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis client ready and authenticated');
});

// Non-blocking connection attempt
(async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.log('⚠️ Redis server is offline. Application running normally without cache.');
  }
})();

/**
 * Senior-level Cache Wrapper Utility Object with Fallback
 */
const cache = {
  client: redisClient,

  async set(key, value, ttlSeconds = null) {
    try {
      if (!redisClient.isOpen) return;
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      if (ttlSeconds) {
        await redisClient.set(key, stringValue, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, stringValue);
      }
    } catch (error) {
      // Fail silently if offline
    }
  },

  async get(key) {
    try {
      if (!redisClient.isOpen) return null;
      const data = await redisClient.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return data;
      }
    } catch (error) {
      return null;
    }
  },

  async del(keys) {
    try {
      if (!redisClient.isOpen) return;
      if (Array.isArray(keys)) {
        if (keys.length > 0) await redisClient.del(keys);
      } else {
        await redisClient.del(keys);
      }
    } catch (error) {
      // Fail silently
    }
  },

  async invalidatePattern(pattern) {
    try {
      if (!redisClient.isOpen) return;
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🧹 Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      // Fail silently
    }
  }
};

module.exports = cache;
