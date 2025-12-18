/**
 * UC-136: Caching Layer for Frequently Accessed Data
 *
 * This module provides a caching layer with a Redis-like API.
 *
 * - If a real Redis instance is configured (e.g. free tier on Upstash, Redis Cloud)
 *   via `REDIS_URL` or `UPSTASH_REDIS_URL`, it will be used as the primary cache.
 * - If Redis is not available or connection fails, it gracefully falls back to
 *   an in-memory Map-based cache.
 *
 * Features:
 * - TTL-based expiration
 * - LRU eviction when using in-memory cache
 * - Cache statistics tracking
 * - Pattern-based cache invalidation
 */

import dotenv from 'dotenv';
dotenv.config();

// Cache configuration
const CONFIG = {
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10), // 5 minutes default
  cleanupInterval: 60000, // Clean expired entries every minute
};

// ---------------------------------------------------------------------------
// In-memory cache storage (fallback when Redis is not available)
// ---------------------------------------------------------------------------
const cache = new Map();
const cacheMetadata = new Map(); // Stores TTL and access info

// Cache statistics
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  evictions: 0,
};

/**
 * Get current timestamp in seconds
 */
function now() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Check if entry is expired (in-memory cache only)
 */
function isExpired(key) {
  const meta = cacheMetadata.get(key);
  if (!meta) return true;
  return meta.expiresAt && meta.expiresAt < now();
}

/**
 * Evict LRU entries when cache is full
 */
function evictLRU() {
  if (cache.size < CONFIG.maxSize) return;

  // Find least recently used entry
  let oldestKey = null;
  let oldestAccess = Infinity;

  for (const [key, meta] of cacheMetadata.entries()) {
    if (meta.lastAccess < oldestAccess) {
      oldestAccess = meta.lastAccess;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
    cacheMetadata.delete(oldestKey);
    stats.evictions++;
  }
}

/**
 * Clean up expired entries
 */
function cleanupExpired() {
  const currentTime = now();
  for (const [key, meta] of cacheMetadata.entries()) {
    if (meta.expiresAt && meta.expiresAt < currentTime) {
      cache.delete(key);
      cacheMetadata.delete(key);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupExpired, CONFIG.cleanupInterval);

// ---------------------------------------------------------------------------
// Optional Redis client (used when REDIS_URL / UPSTASH_REDIS_URL is provided)
// ---------------------------------------------------------------------------

let redisClient = null;
let redisReady = false;

async function initRedis() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (!redisUrl) {
    return;
  }

  try {
    // Dynamic import so that Redis is an optional dependency
    const { createClient } = await import('redis');

    const client = createClient({ url: redisUrl });

    client.on('error', (err) => {
      console.warn('⚠️ Redis cache error, falling back to in-memory cache:', err.message);
    });

    await client.connect();

    redisClient = client;
    redisReady = true;
    console.log('✅ Redis cache connected');
  } catch (err) {
    console.warn(
      '⚠️ Redis client not available or connection failed, using in-memory cache only:',
      err.message
    );
  }
}

// Fire-and-forget initialization; cacheService will fall back to in-memory
initRedis();

function isRedisAvailable() {
  return !!redisClient && redisReady;
}

/**
 * Cache API - Redis-compatible interface
 */
export const cacheService = {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or null
   */
  async get(key) {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        const raw = await redisClient.get(key);
        if (raw === null || raw === undefined) {
          stats.misses++;
          return null;
        }
        stats.hits++;
        return JSON.parse(raw);
      } catch (err) {
        console.warn('⚠️ Redis GET failed, falling back to in-memory cache:', err.message);
      }
    }

    // In-memory fallback
    if (isExpired(key)) {
      cache.delete(key);
      cacheMetadata.delete(key);
      stats.misses++;
      return null;
    }

    const value = cache.get(key);
    if (value === undefined) {
      stats.misses++;
      return null;
    }

    // Update last access time
    const meta = cacheMetadata.get(key);
    if (meta) {
      meta.lastAccess = now();
    }

    stats.hits++;
    return value;
  },

  /**
   * Set value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   */
  async set(key, value, ttl = CONFIG.defaultTTL) {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          await redisClient.set(key, serialized, { EX: ttl });
        } else {
          await redisClient.set(key, serialized);
        }
        stats.sets++;
        return true;
      } catch (err) {
        console.warn('⚠️ Redis SET failed, falling back to in-memory cache:', err.message);
      }
    }

    // In-memory fallback
    // Evict if necessary
    evictLRU();

    cache.set(key, value);
    cacheMetadata.set(key, {
      expiresAt: ttl > 0 ? now() + ttl : null,
      lastAccess: now(),
      createdAt: now(),
    });

    stats.sets++;
    return true;
  },

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        const res = await redisClient.del(key);
        if (res > 0) stats.deletes++;
        return res;
      } catch (err) {
        console.warn('⚠️ Redis DEL failed, falling back to in-memory cache:', err.message);
      }
    }

    const existed = cache.has(key);
    cache.delete(key);
    cacheMetadata.delete(key);
    if (existed) stats.deletes++;
    return existed ? 1 : 0;
  },

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern with * wildcard
   */
  async delPattern(pattern) {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        const keys = await redisClient.keys(pattern);
        let deleted = 0;
        for (const key of keys) {
          const res = await redisClient.del(key);
          if (res > 0) {
            deleted += res;
            stats.deletes += res;
          }
        }
        return deleted;
      } catch (err) {
        console.warn('⚠️ Redis DEL PATTERN failed, falling back to in-memory cache:', err.message);
      }
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    let deleted = 0;

    for (const key of cache.keys()) {
      if (regex.test(key)) {
        cache.delete(key);
        cacheMetadata.delete(key);
        deleted++;
        stats.deletes++;
      }
    }

    return deleted;
  },

  /**
   * Check if key exists (and is not expired)
   * @param {string} key - Cache key
   */
  async exists(key) {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        const res = await redisClient.exists(key);
        return res === 1;
      } catch (err) {
        console.warn('⚠️ Redis EXISTS failed, falling back to in-memory cache:', err.message);
      }
    }

    return !isExpired(key) && cache.has(key);
  },

  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {number} TTL in seconds, -1 if no TTL, -2 if not exists
   */
  async ttl(key) {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        return await redisClient.ttl(key);
      } catch (err) {
        console.warn('⚠️ Redis TTL failed, falling back to in-memory cache:', err.message);
      }
    }

    if (!cache.has(key)) return -2;
    const meta = cacheMetadata.get(key);
    if (!meta || !meta.expiresAt) return -1;
    const remaining = meta.expiresAt - now();
    return remaining > 0 ? remaining : -2;
  },

  /**
   * Clear all cache entries
   */
  async flushAll() {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        await redisClient.flushAll();
        return true;
      } catch (err) {
        console.warn('⚠️ Redis FLUSHALL failed, falling back to in-memory cache:', err.message);
      }
    }

    cache.clear();
    cacheMetadata.clear();
    return true;
  },

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = stats.hits + stats.misses > 0
      ? (stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...stats,
      hitRate: `${hitRate}%`,
      size: cache.size,
      maxSize: CONFIG.maxSize,
    };
  },

  /**
   * Get all keys (for debugging)
   */
  async keys(pattern = '*') {
    // Prefer Redis when available
    if (isRedisAvailable()) {
      try {
        return await redisClient.keys(pattern);
      } catch (err) {
        console.warn('⚠️ Redis KEYS failed, falling back to in-memory cache:', err.message);
      }
    }

    if (pattern === '*') {
      return Array.from(cache.keys());
    }
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Array.from(cache.keys()).filter(key => regex.test(key));
  },
};

/**
 * Cache wrapper for async functions
 * @param {string} keyPrefix - Prefix for cache keys
 * @param {Function} fn - Async function to cache
 * @param {number} ttl - Cache TTL in seconds
 */
export function cacheWrap(keyPrefix, fn, ttl = CONFIG.defaultTTL) {
  return async function(...args) {
    const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
    
    // Try to get from cache
    const cached = await cacheService.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn(...args);
    await cacheService.set(cacheKey, result, ttl);
    
    return result;
  };
}

/**
 * Cache keys for common data
 */
export const CACHE_KEYS = {
  // User-specific
  userProfile: (userId) => `user:${userId}:profile`,
  userJobs: (userId) => `user:${userId}:jobs`,
  userResumes: (userId) => `user:${userId}:resumes`,
  userDashboard: (userId) => `user:${userId}:dashboard`,
  
  // Company data
  companyResearch: (company) => `company:${company}:research`,
  salaryData: (role, location) => `salary:${role}:${location}`,
  
  // System data
  coverLetterTemplates: () => 'system:cover_letter_templates',
  skills: () => 'system:skills',
};

/**
 * Cache invalidation helpers
 */
export const invalidateCache = {
  user: async (userId) => {
    await cacheService.delPattern(`user:${userId}:*`);
  },
  company: async (company) => {
    await cacheService.delPattern(`company:${company}:*`);
  },
  all: async () => {
    await cacheService.flushAll();
  },
};

export default cacheService;

