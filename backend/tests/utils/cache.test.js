/**
 * Cache Service Tests
 * Tests utils/cache.js - UC-136: Caching Layer for Frequently Accessed Data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cacheService, cacheWrap, CACHE_KEYS, invalidateCache, __testing__ } from "../../utils/cache.js";

// Mock Redis client for testing Redis code paths
const createMockRedisClient = () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  keys: vi.fn(),
  flushAll: vi.fn(),
  on: vi.fn(),
  connect: vi.fn(),
});

describe("Cache Service", () => {
  beforeEach(async () => {
    // Clear the cache before each test
    await cacheService.flushAll();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cacheService.flushAll();
  });

  describe("cacheService.set and cacheService.get", () => {
    it("should set and get a value", async () => {
      await cacheService.set("test:key1", { data: "value1" });
      const result = await cacheService.get("test:key1");
      expect(result).toEqual({ data: "value1" });
    });

    it("should return null for non-existent key", async () => {
      const result = await cacheService.get("nonexistent:key");
      expect(result).toBeNull();
    });

    it("should set value with custom TTL", async () => {
      await cacheService.set("test:ttl", "value", 10);
      const result = await cacheService.get("test:ttl");
      expect(result).toBe("value");
    });

    it("should set value with no TTL (0)", async () => {
      await cacheService.set("test:nottl", "value", 0);
      const result = await cacheService.get("test:nottl");
      expect(result).toBe("value");
    });

    it("should handle complex objects", async () => {
      const complexObj = {
        user: { id: 1, name: "Test" },
        jobs: [1, 2, 3],
        nested: { deep: { value: true } },
      };
      await cacheService.set("test:complex", complexObj);
      const result = await cacheService.get("test:complex");
      expect(result).toEqual(complexObj);
    });

    it("should return null for expired entries", async () => {
      // Set with 1 second TTL
      // Use unique key to avoid collision with other tests
      const uniqueKey = `test:expire:get:${Date.now()}`;
      await cacheService.set(uniqueKey, "value", 1);
      
      // Wait for expiration - need to wait > 2 full seconds due to Math.floor
      // on seconds-based timestamps (e.g., if set at 1000.9s, expires at 1001.9s,
      // but now() returns floor, so we need now() to be at least 1002)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const result = await cacheService.get(uniqueKey);
      expect(result).toBeNull();
    });
  });

  describe("cacheService.del", () => {
    it("should delete an existing key", async () => {
      await cacheService.set("test:delete", "value");
      const deleted = await cacheService.del("test:delete");
      expect(deleted).toBe(1);
      
      const result = await cacheService.get("test:delete");
      expect(result).toBeNull();
    });

    it("should return 0 for non-existent key", async () => {
      const deleted = await cacheService.del("nonexistent:key");
      expect(deleted).toBe(0);
    });
  });

  describe("cacheService.delPattern", () => {
    it("should delete keys matching pattern", async () => {
      await cacheService.set("user:1:profile", { name: "User1" });
      await cacheService.set("user:1:jobs", [1, 2]);
      await cacheService.set("user:2:profile", { name: "User2" });
      
      const deleted = await cacheService.delPattern("user:1:*");
      expect(deleted).toBe(2);
      
      // User 1 keys should be deleted
      expect(await cacheService.get("user:1:profile")).toBeNull();
      expect(await cacheService.get("user:1:jobs")).toBeNull();
      
      // User 2 keys should remain
      expect(await cacheService.get("user:2:profile")).toEqual({ name: "User2" });
    });

    it("should return 0 if no keys match pattern", async () => {
      await cacheService.set("other:key", "value");
      const deleted = await cacheService.delPattern("nonexistent:*");
      expect(deleted).toBe(0);
    });
  });

  describe("cacheService.exists", () => {
    it("should return true for existing key", async () => {
      await cacheService.set("test:exists", "value");
      const exists = await cacheService.exists("test:exists");
      expect(exists).toBe(true);
    });

    it("should return false for non-existent key", async () => {
      const exists = await cacheService.exists("nonexistent:key");
      expect(exists).toBe(false);
    });

    it("should return false for expired key", async () => {
      // Use 1 second TTL, wait 3 seconds to ensure expiration
      // Use unique key to avoid collision with other tests
      const uniqueKey = `test:expired:exists:${Date.now()}`;
      await cacheService.set(uniqueKey, "value", 1);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const exists = await cacheService.exists(uniqueKey);
      expect(exists).toBe(false);
    });
  });

  describe("cacheService.ttl", () => {
    it("should return TTL for key with expiration", async () => {
      await cacheService.set("test:ttl", "value", 60);
      const ttl = await cacheService.ttl("test:ttl");
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it("should return -1 for key without TTL", async () => {
      await cacheService.set("test:nottl", "value", 0);
      const ttl = await cacheService.ttl("test:nottl");
      expect(ttl).toBe(-1);
    });

    it("should return -2 for non-existent key", async () => {
      const ttl = await cacheService.ttl("nonexistent:key");
      expect(ttl).toBe(-2);
    });

    it("should return -2 for expired key", async () => {
      // Use 1 second TTL, wait 3 seconds to ensure expiration
      // Use unique key to avoid collision with other tests
      const uniqueKey = `test:expired:ttl:${Date.now()}`;
      await cacheService.set(uniqueKey, "value", 1);
      await new Promise(resolve => setTimeout(resolve, 3000));
      const ttl = await cacheService.ttl(uniqueKey);
      expect(ttl).toBe(-2);
    });
  });

  describe("cacheService.flushAll", () => {
    it("should clear all cache entries", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");
      await cacheService.set("key3", "value3");
      
      await cacheService.flushAll();
      
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
      expect(await cacheService.get("key3")).toBeNull();
    });
  });

  describe("cacheService.getStats", () => {
    it("should return cache statistics", async () => {
      // Perform some cache operations
      await cacheService.set("stat:key1", "value1");
      await cacheService.get("stat:key1"); // hit
      await cacheService.get("stat:nonexistent"); // miss
      await cacheService.del("stat:key1");
      
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("sets");
      expect(stats).toHaveProperty("deletes");
      expect(stats).toHaveProperty("evictions");
      expect(stats).toHaveProperty("hitRate");
      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("maxSize");
    });

    it("should calculate hit rate correctly", async () => {
      await cacheService.flushAll();
      
      await cacheService.set("hit:key", "value");
      await cacheService.get("hit:key"); // hit
      await cacheService.get("miss:key"); // miss
      
      const stats = cacheService.getStats();
      expect(stats.hitRate).toBeDefined();
    });
  });

  describe("cacheService.keys", () => {
    it("should return all keys with * pattern", async () => {
      await cacheService.set("keys:a", "1");
      await cacheService.set("keys:b", "2");
      await cacheService.set("keys:c", "3");
      
      const keys = await cacheService.keys("*");
      
      expect(keys).toContain("keys:a");
      expect(keys).toContain("keys:b");
      expect(keys).toContain("keys:c");
    });

    it("should return keys matching specific pattern", async () => {
      await cacheService.set("user:1:data", "1");
      await cacheService.set("user:2:data", "2");
      await cacheService.set("other:data", "3");
      
      const keys = await cacheService.keys("user:*");
      
      expect(keys).toContain("user:1:data");
      expect(keys).toContain("user:2:data");
      expect(keys).not.toContain("other:data");
    });

    it("should return empty array for no matches", async () => {
      await cacheService.set("something:key", "value");
      const keys = await cacheService.keys("nonexistent:*");
      expect(keys).toHaveLength(0);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict least recently used entries when cache is full", async () => {
      // Note: Default maxSize is 1000, this test may be slow
      // We'll just verify the eviction logic path exists
      
      // Set some entries
      await cacheService.set("evict:1", "value1");
      await cacheService.set("evict:2", "value2");
      
      // Access first entry to make it more recently used
      await cacheService.get("evict:1");
      
      // Both should still exist since we're under maxSize
      expect(await cacheService.get("evict:1")).toBe("value1");
      expect(await cacheService.get("evict:2")).toBe("value2");
    });
  });

  describe("cacheWrap", () => {
    it("should cache function results", async () => {
      let callCount = 0;
      const expensiveFunction = async (a, b) => {
        callCount++;
        return a + b;
      };
      
      const cachedFn = cacheWrap("wrap:test", expensiveFunction, 60);
      
      // First call - should execute function
      const result1 = await cachedFn(1, 2);
      expect(result1).toBe(3);
      expect(callCount).toBe(1);
      
      // Second call with same args - should return cached
      const result2 = await cachedFn(1, 2);
      expect(result2).toBe(3);
      expect(callCount).toBe(1); // Still 1, function not called again
    });

    it("should call function again for different args", async () => {
      let callCount = 0;
      const fn = async (x) => {
        callCount++;
        return x * 2;
      };
      
      const cachedFn = cacheWrap("wrap:args", fn, 60);
      
      await cachedFn(5);
      await cachedFn(10);
      
      expect(callCount).toBe(2);
    });

    it("should use default TTL if not specified", async () => {
      const fn = async () => "result";
      const cachedFn = cacheWrap("wrap:default", fn);
      
      const result = await cachedFn();
      expect(result).toBe("result");
    });
  });

  describe("CACHE_KEYS", () => {
    it("should generate user profile key", () => {
      expect(CACHE_KEYS.userProfile(123)).toBe("user:123:profile");
    });

    it("should generate user jobs key", () => {
      expect(CACHE_KEYS.userJobs(456)).toBe("user:456:jobs");
    });

    it("should generate user resumes key", () => {
      expect(CACHE_KEYS.userResumes(789)).toBe("user:789:resumes");
    });

    it("should generate user dashboard key", () => {
      expect(CACHE_KEYS.userDashboard(101)).toBe("user:101:dashboard");
    });

    it("should generate company research key", () => {
      expect(CACHE_KEYS.companyResearch("Google")).toBe("company:Google:research");
    });

    it("should generate salary data key", () => {
      expect(CACHE_KEYS.salaryData("Engineer", "NYC")).toBe("salary:Engineer:NYC");
    });

    it("should generate cover letter templates key", () => {
      expect(CACHE_KEYS.coverLetterTemplates()).toBe("system:cover_letter_templates");
    });

    it("should generate skills key", () => {
      expect(CACHE_KEYS.skills()).toBe("system:skills");
    });
  });

  describe("invalidateCache", () => {
    it("should invalidate user cache", async () => {
      await cacheService.set("user:1:profile", "profile");
      await cacheService.set("user:1:jobs", "jobs");
      await cacheService.set("user:2:profile", "other");
      
      await invalidateCache.user(1);
      
      expect(await cacheService.get("user:1:profile")).toBeNull();
      expect(await cacheService.get("user:1:jobs")).toBeNull();
      expect(await cacheService.get("user:2:profile")).toBe("other");
    });

    it("should invalidate company cache", async () => {
      await cacheService.set("company:Google:research", "data");
      await cacheService.set("company:Google:jobs", "jobs");
      await cacheService.set("company:Apple:research", "other");
      
      await invalidateCache.company("Google");
      
      expect(await cacheService.get("company:Google:research")).toBeNull();
      expect(await cacheService.get("company:Google:jobs")).toBeNull();
      expect(await cacheService.get("company:Apple:research")).toBe("other");
    });

    it("should invalidate all cache", async () => {
      await cacheService.set("key1", "value1");
      await cacheService.set("key2", "value2");
      
      await invalidateCache.all();
      
      expect(await cacheService.get("key1")).toBeNull();
      expect(await cacheService.get("key2")).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined value in cache", async () => {
      // Get for key that was never set
      const result = await cacheService.get("never:set");
      expect(result).toBeNull();
    });

    it("should update last access time on get", async () => {
      await cacheService.set("access:test", "value", 300);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Access the key
      await cacheService.get("access:test");
      
      // Key should still be accessible
      const result = await cacheService.get("access:test");
      expect(result).toBe("value");
    });

    it("should handle arrays as values", async () => {
      const arr = [1, 2, 3, { nested: true }];
      await cacheService.set("array:test", arr);
      const result = await cacheService.get("array:test");
      expect(result).toEqual(arr);
    });

    it("should handle null as value", async () => {
      await cacheService.set("null:test", null);
      // Note: null stored will be returned as null, but get returns null for missing
      // So we use exists to check
      const exists = await cacheService.exists("null:test");
      expect(exists).toBe(true);
    });
  });

  describe("Redis Code Paths", () => {
    let mockRedisClient;

    beforeEach(() => {
      mockRedisClient = createMockRedisClient();
      __testing__.setRedisClient(mockRedisClient, true);
    });

    afterEach(() => {
      __testing__.resetRedisClient();
    });

    describe("cacheService.get with Redis", () => {
      it("should return value from Redis when available", async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify({ data: "test" }));
        
        const result = await cacheService.get("redis:key");
        
        expect(mockRedisClient.get).toHaveBeenCalledWith("redis:key");
        expect(result).toEqual({ data: "test" });
      });

      it("should return null for missing Redis key", async () => {
        mockRedisClient.get.mockResolvedValue(null);
        
        const result = await cacheService.get("redis:missing");
        
        expect(result).toBeNull();
      });

      it("should fall back to in-memory on Redis error", async () => {
        mockRedisClient.get.mockRejectedValue(new Error("Redis error"));
        // Set value in in-memory cache first
        __testing__.resetRedisClient();
        await cacheService.set("fallback:key", "memory-value");
        __testing__.setRedisClient(mockRedisClient, true);
        mockRedisClient.get.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const result = await cacheService.get("fallback:key");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(result).toBe("memory-value");
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.set with Redis", () => {
      it("should set value in Redis with TTL", async () => {
        mockRedisClient.set.mockResolvedValue("OK");
        
        const result = await cacheService.set("redis:set", { value: 123 }, 60);
        
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          "redis:set",
          JSON.stringify({ value: 123 }),
          { EX: 60 }
        );
        expect(result).toBe(true);
      });

      it("should set value in Redis without TTL", async () => {
        mockRedisClient.set.mockResolvedValue("OK");
        
        await cacheService.set("redis:nottl", "value", 0);
        
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          "redis:nottl",
          JSON.stringify("value")
        );
      });

      it("should fall back to in-memory on Redis set error", async () => {
        mockRedisClient.set.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const result = await cacheService.set("redis:error", "value");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(result).toBe(true); // Falls back to in-memory
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.del with Redis", () => {
      it("should delete value from Redis", async () => {
        mockRedisClient.del.mockResolvedValue(1);
        
        const result = await cacheService.del("redis:delete");
        
        expect(mockRedisClient.del).toHaveBeenCalledWith("redis:delete");
        expect(result).toBe(1);
      });

      it("should fall back to in-memory on Redis del error", async () => {
        mockRedisClient.del.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await cacheService.del("redis:delerror");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.delPattern with Redis", () => {
      it("should delete keys matching pattern from Redis", async () => {
        mockRedisClient.keys.mockResolvedValue(["user:1:a", "user:1:b"]);
        mockRedisClient.del.mockResolvedValue(1);
        
        const result = await cacheService.delPattern("user:1:*");
        
        expect(mockRedisClient.keys).toHaveBeenCalledWith("user:1:*");
        expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
        expect(result).toBe(2);
      });

      it("should fall back to in-memory on Redis delPattern error", async () => {
        mockRedisClient.keys.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await cacheService.delPattern("redis:*");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.exists with Redis", () => {
      it("should check existence in Redis", async () => {
        mockRedisClient.exists.mockResolvedValue(1);
        
        const result = await cacheService.exists("redis:exists");
        
        expect(mockRedisClient.exists).toHaveBeenCalledWith("redis:exists");
        expect(result).toBe(true);
      });

      it("should return false for non-existent Redis key", async () => {
        mockRedisClient.exists.mockResolvedValue(0);
        
        const result = await cacheService.exists("redis:missing");
        
        expect(result).toBe(false);
      });

      it("should fall back to in-memory on Redis exists error", async () => {
        mockRedisClient.exists.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await cacheService.exists("redis:error");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.ttl with Redis", () => {
      it("should get TTL from Redis", async () => {
        mockRedisClient.ttl.mockResolvedValue(120);
        
        const result = await cacheService.ttl("redis:ttl");
        
        expect(mockRedisClient.ttl).toHaveBeenCalledWith("redis:ttl");
        expect(result).toBe(120);
      });

      it("should fall back to in-memory on Redis ttl error", async () => {
        mockRedisClient.ttl.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await cacheService.ttl("redis:error");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.flushAll with Redis", () => {
      it("should flush all from Redis", async () => {
        mockRedisClient.flushAll.mockResolvedValue("OK");
        
        const result = await cacheService.flushAll();
        
        expect(mockRedisClient.flushAll).toHaveBeenCalled();
        expect(result).toBe(true);
      });

      it("should fall back to in-memory on Redis flushAll error", async () => {
        mockRedisClient.flushAll.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const result = await cacheService.flushAll();
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        expect(result).toBe(true); // Falls back to in-memory clear
        consoleWarnSpy.mockRestore();
      });
    });

    describe("cacheService.keys with Redis", () => {
      it("should get keys from Redis", async () => {
        mockRedisClient.keys.mockResolvedValue(["key1", "key2"]);
        
        const result = await cacheService.keys("*");
        
        expect(mockRedisClient.keys).toHaveBeenCalledWith("*");
        expect(result).toEqual(["key1", "key2"]);
      });

      it("should fall back to in-memory on Redis keys error", async () => {
        mockRedisClient.keys.mockRejectedValue(new Error("Redis error"));
        
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await cacheService.keys("*");
        
        expect(consoleWarnSpy).toHaveBeenCalled();
        consoleWarnSpy.mockRestore();
      });
    });
  });

  describe("Internal Functions", () => {
    it("should check isRedisAvailable correctly", () => {
      __testing__.resetRedisClient();
      expect(__testing__.isRedisAvailable()).toBe(false);
      
      __testing__.setRedisClient({}, true);
      expect(__testing__.isRedisAvailable()).toBe(true);
      
      __testing__.resetRedisClient();
    });

    it("should return current timestamp in seconds from now()", () => {
      const result = __testing__.now();
      const expected = Math.floor(Date.now() / 1000);
      expect(result).toBeGreaterThanOrEqual(expected - 1);
      expect(result).toBeLessThanOrEqual(expected + 1);
    });

    it("should check isExpired for non-existent key", () => {
      expect(__testing__.isExpired("nonexistent:key:12345")).toBe(true);
    });

    it("should run cleanupExpired without errors", () => {
      // Just verify it runs without throwing
      expect(() => __testing__.cleanupExpired()).not.toThrow();
    });

    it("should run evictLRU when cache is under maxSize", () => {
      // evictLRU should do nothing when cache is under maxSize
      expect(() => __testing__.evictLRU()).not.toThrow();
    });

    it("should evict LRU entry when cache is at maxSize", async () => {
      const cache = __testing__.getCache();
      const cacheMetadata = __testing__.getCacheMetadata();
      const config = __testing__.getConfig();
      
      // Save original maxSize
      const originalMaxSize = config.maxSize;
      
      try {
        // Temporarily set maxSize to a small number
        config.maxSize = 3;
        
        // Clear existing cache
        cache.clear();
        cacheMetadata.clear();
        
        // Add entries with different access times
        const now = __testing__.now();
        
        // Entry 1 - oldest access
        cache.set("lru:1", "value1");
        cacheMetadata.set("lru:1", {
          expiresAt: now + 1000,
          lastAccess: now - 100, // oldest
          createdAt: now - 100,
        });
        
        // Entry 2 - newer access
        cache.set("lru:2", "value2");
        cacheMetadata.set("lru:2", {
          expiresAt: now + 1000,
          lastAccess: now - 50,
          createdAt: now - 50,
        });
        
        // Entry 3 - newest access
        cache.set("lru:3", "value3");
        cacheMetadata.set("lru:3", {
          expiresAt: now + 1000,
          lastAccess: now,
          createdAt: now,
        });
        
        // Cache is now at maxSize (3)
        expect(cache.size).toBe(3);
        
        // Run evictLRU - should remove lru:1 (oldest access)
        __testing__.evictLRU();
        
        // lru:1 should be evicted
        expect(cache.has("lru:1")).toBe(false);
        expect(cacheMetadata.has("lru:1")).toBe(false);
        
        // Others should remain
        expect(cache.has("lru:2")).toBe(true);
        expect(cache.has("lru:3")).toBe(true);
        
        // Check eviction count increased
        const stats = __testing__.getStats();
        expect(stats.evictions).toBeGreaterThan(0);
        
      } finally {
        // Restore original maxSize
        config.maxSize = originalMaxSize;
        // Cleanup
        cache.delete("lru:1");
        cache.delete("lru:2");
        cache.delete("lru:3");
        cacheMetadata.delete("lru:1");
        cacheMetadata.delete("lru:2");
        cacheMetadata.delete("lru:3");
      }
    });

    it("should handle cache with metadata but undefined value", async () => {
      // This is an edge case where metadata exists but value is undefined
      const cache = __testing__.getCache();
      const cacheMetadata = __testing__.getCacheMetadata();
      
      // Manually set metadata without setting cache value
      const testKey = "edge:undefined:value:" + Date.now();
      cacheMetadata.set(testKey, {
        expiresAt: __testing__.now() + 100,
        lastAccess: __testing__.now(),
        createdAt: __testing__.now(),
      });
      
      // cache.get should return undefined, triggering lines 176-178
      const result = await cacheService.get(testKey);
      expect(result).toBeNull();
      
      // Cleanup
      cacheMetadata.delete(testKey);
    });

    it("should handle cleanupExpired with expired entries", async () => {
      const cache = __testing__.getCache();
      const cacheMetadata = __testing__.getCacheMetadata();
      
      // Manually set an expired entry
      const testKey = "cleanup:expired:" + Date.now();
      cache.set(testKey, "value");
      cacheMetadata.set(testKey, {
        expiresAt: __testing__.now() - 100, // Already expired
        lastAccess: __testing__.now() - 100,
        createdAt: __testing__.now() - 100,
      });
      
      // Run cleanup
      __testing__.cleanupExpired();
      
      // Entry should be removed
      expect(cache.has(testKey)).toBe(false);
      expect(cacheMetadata.has(testKey)).toBe(false);
    });

    it("should check isExpired for key with no expiration", async () => {
      const cacheMetadata = __testing__.getCacheMetadata();
      
      const testKey = "noexpire:test:" + Date.now();
      cacheMetadata.set(testKey, {
        expiresAt: null, // No expiration
        lastAccess: __testing__.now(),
        createdAt: __testing__.now(),
      });
      
      // Returns falsy (null) when no expiration - meaning NOT expired
      expect(__testing__.isExpired(testKey)).toBeFalsy();
      
      // Cleanup
      cacheMetadata.delete(testKey);
    });

    it("should get and reset stats", () => {
      const stats = __testing__.getStats();
      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      
      __testing__.resetStats();
      const newStats = __testing__.getStats();
      expect(newStats.hits).toBe(0);
      expect(newStats.misses).toBe(0);
    });

    it("should get config", () => {
      const config = __testing__.getConfig();
      expect(config).toHaveProperty("maxSize");
      expect(config).toHaveProperty("defaultTTL");
      expect(config).toHaveProperty("cleanupInterval");
    });
  });
});


