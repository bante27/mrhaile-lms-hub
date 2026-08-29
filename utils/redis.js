const { createClient } = require('redis');

// Initialize Redis client using environment variables or default local connection
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

// Flag to track if we've already logged the connection refusal to avoid log spamming
let isConnected = false;

redisClient.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    if (isConnected) {
      console.warn('⚠️ Redis connection lost:', err.message);
      isConnected = false;
    }
  } else {
    console.error('❌ Redis Client Error:', err);
  }
});

redisClient.on('connect', () => {
  isConnected = true;
  console.log('🔄 Redis client connected');
});

redisClient.on('ready', () => {
  isConnected = true;
  console.log('✅ Redis client ready and authenticated');
});

// Self-initializing connection function with graceful fallback handling
const connectRedis = async () => {
  try {
    if (!redisClient.isOpen && !redisClient.isConnecting) {
      await redisClient.connect();
    }
  } catch (error) {
    // Silently catch initial ECONNREFUSED so it doesn't spam logs or crash the app
    if (error.code !== 'ECONNREFUSED') {
      console.warn('⚠️ Redis connection skipped/failed (server will run without caching):', error.message);
    }
  }
};

// Immediately trigger connection attempt
connectRedis();

/**
 * Senior-level Cache Wrapper Utility Object
 */
const cache = {
  client: redisClient,

  /**
   * Set a key-value pair with optional TTL in seconds
   */
  async set(key, value, ttlSeconds = null) {
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
      if (ttlSeconds) {
        await redisClient.set(key, stringValue, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, stringValue);
      }
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error.message);
    }
  },

  /**
   * Get and parse JSON value by key
   */
  async get(key) {
    try {
      const data = await redisClient.get(key);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        return data; // Return as plain string if not JSON
      }
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  },

  /**
   * Delete one or more keys
   */
  async del(keys) {
    try {
      if (Array.isArray(keys)) {
        if (keys.length > 0) await redisClient.del(keys);
      } else {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(`Redis DEL error:`, error.message);
    }
  },

  /**
   * Invalidate keys matching a pattern (e.g., 'course:*')
   */
  async invalidatePattern(pattern) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log(`🧹 Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      console.error(`Redis pattern invalidation error for ${pattern}:`, error.message);
    }
  }
};

module.exports = cache;
