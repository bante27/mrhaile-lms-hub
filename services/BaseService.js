const cache = require('../utils/fallbackCache');

class BaseService {
  constructor(model) {
    this.model = model;
    this.modelName = model.modelName.toLowerCase();
  }

  async getById(id, ttlSeconds = 3600) {
    const cacheKey = `${this.modelName}:${id}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return { data: cachedData, source: 'cache' };
    }

    const doc = await this.model.findById(id);
    if (!doc) {
      return { data: null, source: 'database' };
    }

    await cache.set(cacheKey, doc, ttlSeconds);
    return { data: doc, source: 'database' };
  }

  async getAll(query = {}, ttlSeconds = 1800, suffix = 'list') {
    const cacheKey = `${this.modelName}:${suffix}:${JSON.stringify(query)}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return { data: cachedData, source: 'cache' };
    }

    const docs = await this.model.find(query);
    await cache.set(cacheKey, docs, ttlSeconds);
    return { data: docs, source: 'database' };
  }

  async create(data) {
    const doc = await this.model.create(data);
    await cache.invalidatePattern(`${this.modelName}:*`);
    return doc;
  }

  async update(id, data, options = { new: true }) {
    const doc = await this.model.findByIdAndUpdate(id, data, options);
    if (doc) {
      await cache.del(`${this.modelName}:${id}`);
      await cache.invalidatePattern(`${this.modelName}:*`);
    }
    return doc;
  }

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
