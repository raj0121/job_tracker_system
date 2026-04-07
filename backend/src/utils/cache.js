import Redis from "ioredis";
import logger from "./logger.js";

const DEFAULT_TTL_SECONDS = 3600;
const MAX_CACHE_ENTRIES = 5000;

const resolveCacheProvider = () => {
  const configured = String(process.env.CACHE_PROVIDER || "").trim().toLowerCase();
  if (configured) {
    return configured;
  }

  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    return "redis";
  }

  return "memory";
};

const CACHE_PROVIDER = resolveCacheProvider();
const cacheStore = new Map();
const tagIndex = new Map();

let redis = null;
let redisConnected = false;
let lastRedisSize = null;

const now = () => Date.now();

const normalizeKey = (key) => String(key || "");

const ensureRedisClient = () => {
  if (redis || CACHE_PROVIDER !== "redis") {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 2
    });
  } else {
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT || 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 2
    });
  }

  redis.on("connect", () => {
    redisConnected = true;
  });

  redis.on("error", (error) => {
    redisConnected = false;
    logger.warn({ message: "Redis connection error", error: error.message });
  });

  return redis;
};

const cleanupExpiredEntries = () => {
  const current = now();
  for (const [key, value] of cacheStore.entries()) {
    if (value.expiresAt <= current) {
      cacheStore.delete(key);
      if (value.tags) {
        for (const tag of value.tags) {
          const set = tagIndex.get(tag);
          if (set) {
            set.delete(key);
            if (set.size === 0) {
              tagIndex.delete(tag);
            }
          }
        }
      }
    }
  }
};

const enforceCapacity = () => {
  if (cacheStore.size < MAX_CACHE_ENTRIES) {
    return;
  }

  const entries = Array.from(cacheStore.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt);
  const removeCount = Math.max(1, Math.floor(MAX_CACHE_ENTRIES * 0.1));

  for (let index = 0; index < removeCount && index < entries.length; index += 1) {
    const [key, value] = entries[index];
    cacheStore.delete(key);
    if (value.tags) {
      for (const tag of value.tags) {
        const set = tagIndex.get(tag);
        if (set) {
          set.delete(key);
          if (set.size === 0) {
            tagIndex.delete(tag);
          }
        }
      }
    }
  }
};

const registerTags = (key, tags = []) => {
  if (!tags.length) {
    return;
  }

  for (const tag of tags) {
    if (!tagIndex.has(tag)) {
      tagIndex.set(tag, new Set());
    }
    tagIndex.get(tag).add(key);
  }
};

const redisTagKey = (tag) => `cache:tag:${tag}`;

const storeRedisTags = async (key, ttlSeconds, tags = []) => {
  if (!tags.length) {
    return;
  }

  const client = ensureRedisClient();
  if (!client) {
    return;
  }

  const pipeline = client.multi();
  for (const tag of tags) {
    const tagKey = redisTagKey(tag);
    pipeline.sadd(tagKey, key);
    pipeline.expire(tagKey, ttlSeconds + 600);
  }

  await pipeline.exec();
};

export const getCachedData = async (key) => {
  const cacheKey = normalizeKey(key);

  if (CACHE_PROVIDER === "redis") {
    try {
      const client = ensureRedisClient();
      if (!client) {
        return null;
      }
      const payload = await client.get(cacheKey);
      return payload ? JSON.parse(payload) : null;
    } catch (error) {
      logger.warn({ message: `Cache GET failed for ${cacheKey}`, error: error.message });
      return null;
    }
  }

  try {
    const entry = cacheStore.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= now()) {
      cacheStore.delete(cacheKey);
      return null;
    }

    return entry.value;
  } catch (error) {
    logger.warn({ message: `Cache GET failed for ${cacheKey}`, error: error.message });
    return null;
  }
};

export const setCachedData = async (key, data, duration = DEFAULT_TTL_SECONDS, tags = []) => {
  const cacheKey = normalizeKey(key);
  const ttlSeconds = Math.max(1, Number(duration) || DEFAULT_TTL_SECONDS);

  if (CACHE_PROVIDER === "redis") {
    try {
      const client = ensureRedisClient();
      if (!client) {
        return;
      }

      await client.set(cacheKey, JSON.stringify(data), "EX", ttlSeconds);
      await storeRedisTags(cacheKey, ttlSeconds, tags);
      return;
    } catch (error) {
      logger.warn({ message: `Cache SET failed for ${cacheKey}`, error: error.message });
      return;
    }
  }

  try {
    enforceCapacity();

    const ttlMs = ttlSeconds * 1000;
    cacheStore.set(cacheKey, {
      value: data,
      createdAt: now(),
      expiresAt: now() + ttlMs,
      tags
    });
    registerTags(cacheKey, tags);
  } catch (error) {
    logger.warn({ message: `Cache SET failed for ${cacheKey}`, error: error.message });
  }
};

export const invalidateCache = async (key) => {
  const cacheKey = normalizeKey(key);

  if (CACHE_PROVIDER === "redis") {
    try {
      const client = ensureRedisClient();
      if (client) {
        await client.del(cacheKey);
      }
    } catch (error) {
      logger.warn({ message: `Cache DEL failed for ${cacheKey}`, error: error.message });
    }
    return;
  }

  try {
    cacheStore.delete(cacheKey);
  } catch (error) {
    logger.warn({ message: `Cache DEL failed for ${cacheKey}`, error: error.message });
  }
};

export const invalidateTags = async (tags = []) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return;
  }

  if (CACHE_PROVIDER === "redis") {
    try {
      const client = ensureRedisClient();
      if (!client) {
        return;
      }

      for (const tag of tags) {
        const tagKey = redisTagKey(tag);
        const keys = await client.smembers(tagKey);
        if (keys.length) {
          await client.del(...keys);
        }
        await client.del(tagKey);
      }
    } catch (error) {
      logger.warn({ message: "Cache tag invalidation failed", error: error.message });
    }
    return;
  }

  try {
    for (const tag of tags) {
      const keys = tagIndex.get(tag);
      if (!keys) {
        continue;
      }
      for (const key of keys.values()) {
        cacheStore.delete(key);
      }
      tagIndex.delete(tag);
    }
  } catch (error) {
    logger.warn({ message: "Cache tag invalidation failed", error: error.message });
  }
};

export const invalidatePattern = async (pattern) => {
  const cachePattern = normalizeKey(pattern);

  if (CACHE_PROVIDER === "redis") {
    try {
      const client = ensureRedisClient();
      if (!client) {
        return;
      }

      let cursor = "0";
      do {
        // eslint-disable-next-line no-await-in-loop
        const result = await client.scan(cursor, "MATCH", cachePattern, "COUNT", "200");
        cursor = result[0];
        const keys = result[1];
        if (keys.length) {
          // eslint-disable-next-line no-await-in-loop
          await client.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      logger.warn({ message: `Cache pattern DEL failed for ${cachePattern}`, error: error.message });
    }
    return;
  }

  try {
    const regex = new RegExp(`^${cachePattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\\*/g, ".*")}$`);
    for (const key of cacheStore.keys()) {
      if (regex.test(key)) {
        cacheStore.delete(key);
      }
    }
  } catch (error) {
    logger.warn({ message: `Cache pattern DEL failed for ${cachePattern}`, error: error.message });
  }
};

const refreshRedisStats = async () => {
  if (CACHE_PROVIDER !== "redis") {
    return;
  }

  try {
    const client = ensureRedisClient();
    if (!client) {
      redisConnected = false;
      return;
    }

    lastRedisSize = await client.dbsize();
    redisConnected = true;
  } catch (error) {
    redisConnected = false;
    logger.warn({ message: "Redis stats refresh failed", error: error.message });
  }
};

export const getCacheHealth = () => {
  if (CACHE_PROVIDER === "redis") {
    return {
      provider: "redis",
      connected: redisConnected,
      entries: lastRedisSize,
      maxEntries: null
    };
  }

  cleanupExpiredEntries();

  return {
    provider: "memory",
    connected: true,
    entries: cacheStore.size,
    maxEntries: MAX_CACHE_ENTRIES
  };
};

if (CACHE_PROVIDER === "redis") {
  ensureRedisClient();
  setInterval(() => {
    refreshRedisStats().catch(() => {});
  }, 60 * 1000);
} else {
  setInterval(cleanupExpiredEntries, 60 * 1000);
}
