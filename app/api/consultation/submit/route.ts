import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { getSystemConfig } from '@/lib/content/kv'; // 관리자 설정 불러오기
import { sendSlackNotification, sendTelegramNotification, escapeMarkdownV2, TEL_SEP } from '@/lib/notifications';

// Redis Init (데이터 저장용)
const redis = createClient({
    url: process.env.REDIS_URL || process.env.KV_URL
});
redis.on('error', err => console.error('Redis Client Error', err));

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 유효성 검사
        const hasAnyData = body.name || body.email || body.phone || body.message;
        if (!hasAnyData) {
            return NextResponse.json({ error: 'No data provided' }, { status: 400 });
        }

        const consultationData = {
            id: Date.now().toString(),
            ...body,
            createdAt: new Date().toISOString(),
            status: 'new'
        };

        // 1. 상담 데이터 Redis 저장
        if (!redis.isOpen) await redis.connect();
        await redis.lPush('consultations:list', JSON.stringify(consultationData));

        // 2. 알림 설정 불러오기 (관리자 설정 우선, 없으면 환경변수 사용)
        const systemConfig = await getSystemConfig().catch(() => ({}));

        const slackUrl = (systemConfig.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL || '').trim();
        const telegramToken = (systemConfig.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
        const telegramChatId = (systemConfig.telegramChatId || process.env.TELEGRAM_CHAT_ID || '').trim();

        console.log('Notification Debug:', {
            hasSlack: !!slackUrl,
            hasTelToken: !!telegramToken,
            hasTelChat: !!telegramChatId
        });

        // 3. 알림 데이터 준비
        const slackPayload = {
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
                        { type: "mrkdwn", text: `*담당자명:*\n${body.name}` },
                        { type: "mrkdwn", text: `*회사명:*\n${body.company || '-'}` },
                        { type: "mrkdwn", text: `*이메일:*\n${body.email}` }
                    ]
                },
                {
                    type: "section",
                    text: { type: "mrkdwn", text: `*문의 내용:*\n${body.message || '내용 없음'}` }
                },
                {
                    type: "context",
                    elements: [{ type: "mrkdwn", text: `Created at ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}` }]
                }
            ]
        };

        const safeName = escapeMarkdownV2(String(body.name || ''));
        const safeCompany = escapeMarkdownV2(String(body.company || '-'));
        const safeEmail = escapeMarkdownV2(String(body.email || ''));
        const safePhone = escapeMarkdownV2(String(body.phone || '-'));
        const safeMessage = escapeMarkdownV2(String(body.message || '내용 없음'));

        const telegramMessage = `
📞 *새로운 상담 문의*
${TEL_SEP}
👤 *담당자:* ${safeName}
🏢 *회사:* ${safeCompany}
📧 *이메일:* ${safeEmail}
📱 *연락처:* ${safePhone}
${TEL_SEP}
📝 *문의 내용:*
${safeMessage}
        `.trim();

        console.log('AllSettled starting...');
        // 4. 알림 발송 (Slack & Telegram 병렬 처리)
        const results = await Promise.allSettled([
            sendSlackNotification(slackPayload, slackUrl),
            sendTelegramNotification(telegramMessage, telegramToken, telegramChatId)
        ]);
        console.log('AllSettled complete:', results.map(r => r.status));

        return NextResponse.json({ success: true, message: 'Consultation requested successfully' });

    } catch (error) {
        console.error('Consultation Submit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
