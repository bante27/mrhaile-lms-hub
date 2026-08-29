const memoryStore = new Map();

/**
 * Senior-level Pure In-Memory Cache Utility (Zero Redis Server Required)
 * Guaranteed to work immediately on any machine without needing redis-server or docker.
 */
const fallbackCache = {
    async set(key, value, ttlSeconds = null) {
        try {
            const stringValue = typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
            memoryStore.set(key, {
                value: stringValue,
                expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : null
            });
        } catch (error) {
            console.error(`Memory Cache SET error for ${key}:`, error.message);
        }
    },

    async get(key) {
        try {
            const item = memoryStore.get(key);
            if (!item) return null;

            // Check if expired
            if (item.expiry && Date.now() > item.expiry) {
                memoryStore.delete(key);
                return null;
            }

            // Return deep clone to prevent mutation
            return typeof item.value === 'object' ? JSON.parse(JSON.stringify(item.value)) : item.value;
        } catch (error) {
            console.error(`Memory Cache GET error for ${key}:`, error.message);
            return null;
        }
    },

    async del(keys) {
        try {
            if (Array.isArray(keys)) {
                keys.forEach(k => memoryStore.delete(k));
            } else {
                memoryStore.delete(keys);
            }
        } catch (error) {
            console.error(`Memory Cache DEL error:`, error.message);
        }
    },

    async invalidatePattern(pattern) {
        try {
            // Convert wildcard pattern (e.g., 'course:*') to regex (e.g., /^course:.*/)
            const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
            let count = 0;
            for (const key of memoryStore.keys()) {
                if (regex.test(key)) {
                    memoryStore.delete(key);
                    count++;
                }
            }
            if (count > 0) {
                console.log(`🧹 [Memory Cache] Invalidated ${count} keys matching pattern: ${pattern}`);
            }
        } catch (error) {
            console.error(`Memory Cache pattern invalidation error for ${pattern}:`, error.message);
        }
    }
};

console.log('⚡ [Memory Cache] Initialized and active (Zero-dependency lightning-fast cache)');

module.exports = fallbackCache;
