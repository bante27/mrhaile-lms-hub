const cache = require('../utils/redis');

/**
 * Senior-level Base Service for Mongoose Models in Express.js
 * Handles automatic Cache-Aside pattern & Cache Invalidation for any 15+ controllers.
 */
class BaseService {
  constructor(model) {
    this.model = model;
    this.modelName = model.modelName.toLowerCase();
  }

  /**
   * Get single document by ID with Redis Caching
   */
  async getById(id, ttlSeconds = 3600) {
    const cacheKey = `${this.modelName}:${id}`;

    // 1. Check Redis Cache first
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return { data: cachedData, source: 'cache' };
    }

    // 2. Fallback to MongoDB
    const doc = await this.model.findById(id);
    if (!doc) {
      return { data: null, source: 'database' };
    }

    // 3. Store in Redis Cache
    await cache.set(cacheKey, doc, ttlSeconds);

    return { data: doc, source: 'database' };
  }

  /**
   * Get list of documents with query filters & Caching
   */
  async getAll(query = {}, ttlSeconds = 1800, suffix = 'list') {
    const cacheKey = `${this.modelName}:${suffix}:${JSON.stringify(query)}`;

    // 1. Check Redis Cache
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return { data: cachedData, source: 'cache' };
    }

    // 2. Fetch from MongoDB
    const docs = await this.model.find(query);

    // 3. Store in Redis Cache
    await cache.set(cacheKey, docs, ttlSeconds);

    return { data: docs, source: 'database' };
  }

  /**
   * Create document & invalidate collection caches
   */
  async create(data) {
    const doc = await this.model.create(data);
    // Invalidate all list caches for this model
    await cache.invalidatePattern(`${this.modelName}:*`);
    return doc;
  }

  /**
   * Update document & invalidate item & collection caches
   */
  async update(id, data, options = { new: true }) {
    const doc = await this.model.findByIdAndUpdate(id, data, options);
    if (doc) {
      await cache.del(`${this.modelName}:${id}`);
      await cache.invalidatePattern(`${this.modelName}:*`);
    }
    return doc;
  }

  /**
   * Delete document & invalidate caches
   */
  async delete(id) {
    const doc = await this.model.findByIdAndDelete(id);
    if (doc) {
      await cache.del(`${this.modelName}:${id}`);
      await cache.invalidatePattern(`${this.modelName}:*`);
    }
    return doc;
  }
}

module.exports = BaseService;
