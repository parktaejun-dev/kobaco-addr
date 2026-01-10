/**
 * Redis client for KOBACO Lead Sniper
 * Uses standard redis package with REDIS_URL
 */

import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || process.env.KV_URL || '';

// Create Redis client (Use singleton pattern for Next.js hot-reloading)
const globalForRedis = global as unknown as { redisClient: any; isConnected: boolean };

const redisClient = globalForRedis.redisClient || createClient({
  url: REDIS_URL,
});

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redisClient;
}

redisClient.on('error', (err: any) => console.error('Redis Client Error', err));

// Connection state
let isConnected = globalForRedis.isConnected || false;

/**
 * Ensure Redis is connected before operations
 */
async function ensureConnected() {
  if (!isConnected && REDIS_URL) {
    try {
      if (redisClient.isOpen) {
        isConnected = true;
        globalForRedis.isConnected = true;
        return;
      }
      await redisClient.connect();
      isConnected = true;
      globalForRedis.isConnected = true;
    } catch (err) {
      console.error('Failed to connect to Redis', err);
    }
  }
}

/**
 * Redis wrapper with auto-connect and JSON serialization
 */
export const redis = {
  async get<T>(key: string): Promise<T | null> {
    await ensureConnected();
    const value = await redisClient.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  },

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    await ensureConnected();
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (options?.ex) {
      await redisClient.setEx(key, options.ex, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await ensureConnected();
    await redisClient.del(key);
  },

  async lPush(key: string, value: string): Promise<void> {
    await ensureConnected();
    await redisClient.lPush(key, value);
  },

  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    await ensureConnected();
    return await redisClient.lRange(key, start, stop);
  },

  async lTrim(key: string, start: number, stop: number): Promise<void> {
    await ensureConnected();
    await redisClient.lTrim(key, start, stop);
  },

  async zadd(key: string, options: { score: number; member: string }): Promise<void> {
    await ensureConnected();
    await redisClient.zAdd(key, { score: options.score, value: options.member });
  },

  async zRem(key: string, member: string): Promise<void> {
    await ensureConnected();
    await redisClient.zRem(key, member);
  },

  async zrange(key: string, start: number, stop: number, options?: { rev?: boolean }): Promise<string[]> {
    await ensureConnected();
    if (options?.rev) {
      return await redisClient.zRange(key, start, stop, { REV: true });
    }
    return await redisClient.zRange(key, start, stop);
  },

  async llen(key: string): Promise<number> {
    await ensureConnected();
    return await redisClient.lLen(key);
  },

  async zRangeByScore(key: string, min: number | string, max: number | string, options?: { limit?: { offset: number; count: number } }): Promise<string[]> {
    await ensureConnected();
    if (options?.limit) {
      return await redisClient.zRangeByScore(key, min, max, {
        LIMIT: { offset: options.limit.offset, count: options.limit.count },
      });
    }
    return await redisClient.zRangeByScore(key, min, max);
  },

  async zRevRangeByScore(key: string, max: number | string, min: number | string, options?: { limit?: { offset: number; count: number } }): Promise<string[]> {
    await ensureConnected();
    // Use zRange with REV option for reverse order
    const result = await redisClient.zRange(key, max, min, {
      BY: 'SCORE',
      REV: true,
      LIMIT: options?.limit ? { offset: options.limit.offset, count: options.limit.count } : undefined,
    });
    return result;
  },

  /**
   * Pipeline for batch operations
   */
  pipeline() {
    const commands: Array<() => Promise<any>> = [];

    return {
      set(key: string, value: any) {
        commands.push(async () => {
          await ensureConnected();
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          await redisClient.set(key, serialized);
        });
        return this;
      },

      zadd(key: string, options: { score: number; member: string }) {
        commands.push(async () => {
          await ensureConnected();
          await redisClient.zAdd(key, { score: options.score, value: options.member });
        });
        return this;
      },

      lpush(key: string, value: string) {
        commands.push(async () => {
          await ensureConnected();
          await redisClient.lPush(key, value);
        });
        return this;
      },

      ltrim(key: string, start: number, stop: number) {
        commands.push(async () => {
          await ensureConnected();
          await redisClient.lTrim(key, start, stop);
        });
        return this;
      },

      async exec() {
        await ensureConnected();
        for (const cmd of commands) {
          await cmd();
        }
      },
    };
  },
};

// Export types for convenience
export type RedisClient = typeof redis;
