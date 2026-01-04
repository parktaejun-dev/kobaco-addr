import { NextResponse } from 'next/server';
import { saveHome, saveSection } from '@/lib/content/kv';
import fs from 'fs';
import path from 'path';

// Seed initial data from local JSON files to KV
export async function POST() {
    try {
        const result = { home: false, sections: 0, errors: [] as string[] };
        const contentDir = path.join(process.cwd(), 'content');

        // 1. Seed Home
        try {
            const homePath = path.join(contentDir, 'home.json');
            if (fs.existsSync(homePath)) {
                const homeData = JSON.parse(fs.readFileSync(homePath, 'utf8'));
                await saveHome(homeData);
                result.home = true;
            }
        } catch (e: any) {
            result.errors.push(`Home Seed Error: ${e.message}`);
        }

        // 2. Seed Sections
        try {
            const files = fs.readdirSync(contentDir).filter(f => f !== 'home.json' && f.endsWith('.json'));
            for (const file of files) {
                try {
                    const id = file.replace('.json', '');
                    // Infer type from id or file content. For simplicity, assume file content has type or mapping
                    const raw = fs.readFileSync(path.join(contentDir, file), 'utf8');
                    const data = JSON.parse(raw);

                    // MAPPING: id -> type
                    // In this project, id usually equals type except unique cases, but actually 
                    // schema keys are: hero, valueProps, concept, comparison, howItWorks, useCases, why, estimateGuide, reporting
                    // The seed file names are consistent with this.
                    const type = id;

                    // We need to bypass validation strictly or ensure FS data is valid.
                    // saveSection enforces Zod.
                    await saveSection(id, type, data);
                    result.sections++;
                } catch (inner: any) {
                    result.errors.push(`Section ${file} Seed Error: ${inner.message}`);
                }
            }
        } catch (e: any) {
            result.errors.push(`Sections Dir Error: ${e.message}`);
        }

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
