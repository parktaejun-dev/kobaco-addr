import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import axios from 'axios';

// Redis Init
const redis = createClient({
    url: process.env.REDIS_URL || process.env.KV_URL
});
redis.on('error', err => console.error('Redis Client Error', err));

async function sendSlackNotification(data: any, webhookUrl?: string) {
    const url = webhookUrl || process.env.SLACK_WEBHOOK_URL;
    if (!url) {
        console.warn('Slack Webhook URL not configured');
        return;
    }

    const payload = {
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "📞 새로운 상담 문의가 도착했습니다!",
                    emoji: true
                }
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*담당자명:*\n${data.name}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*회사명:*\n${data.company || '-'}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*연락처:*\n${data.phone}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*이메일:*\n${data.email}`
                    }
                ]
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `*문의 내용:*\n${data.message || '내용 없음'}`
                }
            },
            {
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `Created at ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                    }
                ]
            }
        ]
    };

    try {
        await axios.post(url, payload);
    } catch (e) {
        console.error('Failed to send Slack notification', e);
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Simple Validation
        if (!body.name || !body.phone || !body.email) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const consultationData = {
            id: Date.now().toString(),
            ...body,
            createdAt: new Date().toISOString(),
            status: 'new'
        };

        // 1. Save to Redis
        if (!redis.isOpen) await redis.connect();

        // Save to a list
        await redis.lPush('consultations:list', JSON.stringify(consultationData));
        // Also save as individual key for details if needed later
        // await redis.set(`consultation:${consultationData.id}`, JSON.stringify(consultationData));

        // 2. Send Notification
        await sendSlackNotification(consultationData, body.webhookUrl);

        return NextResponse.json({ success: true, message: 'Consultation requested successfully' });

    } catch (error) {
        console.error('Consultation Submit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
