import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const POLICY_DIR = path.join(process.cwd(), 'policy');

// Use KV_URL (Vercel default) or REDIS_URL
const REDIS_URL = process.env.KV_URL || process.env.REDIS_URL;

let redis: Redis | null = null;
if (REDIS_URL) {
    try {
        redis = new Redis(REDIS_URL);
        console.log('✅ Redis connected via ioredis');
    } catch (e) {
        console.error('❌ Failed to create Redis client:', e);
    }
} else {
    console.log('⚠️ No Redis URL found (KV_URL or REDIS_URL). Using local file system only.');
}

type StoreType = 'content' | 'policy';

/**
 * Get JSON data from Redis (preferred) or File System (fallback).
 */
export async function getJSON(type: StoreType, id: string): Promise<any> {
    const key = `${type}:${id}`;

    // 1. Try Redis
    if (redis) {
        try {
            const data = await redis.get(key);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error(`[Redis] Get Error for ${key}:`, e);
        }
    }

    // 2. Fallback to File System (Seed data)
    try {
        let filePath = '';
        if (type === 'policy') {
            filePath = path.join(POLICY_DIR, `${id}.json`);
        } else if (id === 'home') {
            filePath = path.join(CONTENT_DIR, 'home.json');
        } else {
            filePath = path.join(CONTENT_DIR, 'sections', `${id}.json`);
        }

        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            return JSON.parse(fileContent);
        }
    } catch (e) {
        console.error(`[FS] Read Error for ${id}:`, e);
    }

    return null;
}

/**
 * Save JSON data to Redis (and try FS if local).
 */
export async function setJSON(type: StoreType, id: string, data: any): Promise<void> {
    const key = `${type}:${id}`;
    const jsonString = JSON.stringify(data);

    // 1. Write to Redis (Primary)
    if (redis) {
        try {
            await redis.set(key, jsonString);
            console.log(`[Redis] Updated ${key}`);
        } catch (e) {
            console.error(`[Redis] Set Error for ${key}:`, e);
        }
    } else {
        console.warn(`[Redis] Not configured, skipping write for ${key}`);
    }

    // 2. Write to File System (Local Dev Sync)
    try {
        let filePath = '';
        if (type === 'policy') {
            filePath = path.join(POLICY_DIR, `${id}.json`);
        } else if (id === 'home') {
            filePath = path.join(CONTENT_DIR, 'home.json');
        } else {
            const sectionsDir = path.join(CONTENT_DIR, 'sections');
            if (!fs.existsSync(sectionsDir)) fs.mkdirSync(sectionsDir, { recursive: true });
            filePath = path.join(sectionsDir, `${id}.json`);
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e: any) {
        // Ignore EROFS (Read-only fs)
        if (e.code !== 'EROFS' && e.code !== 'EACCES') {
            console.error(`[FS] Write Error for ${id}:`, e);
        }
    }
}
