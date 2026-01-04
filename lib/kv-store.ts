import { kv } from '@vercel/kv';
import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const POLICY_DIR = path.join(process.cwd(), 'policy');

// Log KV status once
if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    console.log('✅ Vercel KV is configured');
} else {
    console.log('⚠️ Vercel KV is NOT configured. Using local file system only (Read-Only in Vercel)');
}

type StoreType = 'content' | 'policy';

/**
 * Get JSON data from KV (preferred) or File System (fallback).
 * 
 * @param type 'content' (sections) or 'policy'
 * @param id The identifier (e.g., 'hero', 'channels', 'home')
 * @returns Parsed JSON object or null
 */
export async function getJSON(type: StoreType, id: string): Promise<any> {
    const key = `${type}:${id}`;

    // 1. Try KV
    try {
        if (process.env.KV_REST_API_URL) {
            const data = await kv.get(key);
            if (data) {
                // console.log(`[KV] Cache HIT for ${key}`);
                return data;
            }
        }
    } catch (e) {
        console.error(`[KV] Get Error for ${key}:`, e);
    }

    // 2. Fallback to File System (Seed data)
    // console.log(`[KV] Cache MISS for ${key}, falling back to FS`);
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
 * Save JSON data to KV (and try to write to FS if local).
 * 
 * @param type 'content' or 'policy'
 * @param id The identifier
 * @param data Data object to save
 */
export async function setJSON(type: StoreType, id: string, data: any): Promise<void> {
    const key = `${type}:${id}`;

    // 1. Write to KV (Primary)
    if (process.env.KV_REST_API_URL) {
        await kv.set(key, data);
        console.log(`[KV] Updated ${key}`);
    } else {
        console.warn(`[KV] Not configured, skipping KV write for ${key}`);
    }

    // 2. Write to File System (For Local Dev Sync)
    // In Vercel, this will fail (EROFS), so we catch and ignore.
    try {
        let filePath = '';
        if (type === 'policy') {
            filePath = path.join(POLICY_DIR, `${id}.json`);
        } else if (id === 'home') {
            filePath = path.join(CONTENT_DIR, 'home.json');
        } else {
            // Ensure directory exists for new sections
            const sectionsDir = path.join(CONTENT_DIR, 'sections');
            if (!fs.existsSync(sectionsDir)) fs.mkdirSync(sectionsDir, { recursive: true });

            filePath = path.join(sectionsDir, `${id}.json`);
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        // console.log(`[FS] Updated ${filePath}`);
    } catch (e: any) {
        // Build environment or Serverless environment (ReadOnly)
        if (e.code === 'EROFS' || e.code === 'EACCES') {
            // console.log('[FS] Read-only environment, skipped file write');
        } else {
            console.error(`[FS] Write Error for ${id}:`, e);
        }
    }
}
