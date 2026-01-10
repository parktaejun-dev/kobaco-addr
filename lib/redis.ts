/**
 * Upstash Redis client for KOBACO Lead Sniper
 * Singleton pattern for serverless environments
 */

import { Redis } from '@upstash/redis';

const KV_REST_API_URL = process.env.KV_REST_API_URL || '';
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || '';

/**
 * Singleton Upstash Redis client
 * Safe for serverless - uses REST API, no persistent connections
 *
 * NOTE: If credentials are missing at runtime, operations will fail.
 * This is intentional - we fail closed for security.
 */
export const redis = new Redis({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

// Export types for convenience
export type RedisClient = typeof redis;
