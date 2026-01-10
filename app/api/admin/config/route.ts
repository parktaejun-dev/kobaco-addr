import { NextResponse } from 'next/server';
import { getSystemConfig, saveSystemConfig } from '@/lib/content/kv';

const MASKED = '********';

export async function GET() {
    try {
        const config = await getSystemConfig();

        // Mask secrets
        const safeConfig = { ...config };
        if (safeConfig.telegramBotToken) safeConfig.telegramBotToken = MASKED;
        if (safeConfig.telegramChatId) safeConfig.telegramChatId = MASKED;
        if (safeConfig.slackWebhookUrl) safeConfig.slackWebhookUrl = MASKED;

        return NextResponse.json(safeConfig);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Merge with existing config to avoid overwriting other potential future keys
        const current = await getSystemConfig();

        // Handle masked values: if body contains MASKED, keep the current value
        const finalConfig = { ...current, ...body };

        if (body.telegramBotToken === MASKED) {
            finalConfig.telegramBotToken = current.telegramBotToken;
        }
        if (body.telegramChatId === MASKED) {
            finalConfig.telegramChatId = current.telegramChatId;
        }
        if (body.slackWebhookUrl === MASKED) {
            finalConfig.slackWebhookUrl = current.slackWebhookUrl;
        }

        await saveSystemConfig(finalConfig);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Config Save Error:', error);
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
