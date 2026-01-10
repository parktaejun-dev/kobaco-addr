/**
 * AI Provider for KOBACO Lead Sniper
 * Supports Gemini and DeepSeek with strict JSON validation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { AIAnalysisSchema, type AIAnalysis } from './crm-types';

// ============================================================================
// Environment Validation
// ============================================================================

const AI_PROVIDER = process.env.AI_PROVIDER as 'gemini' | 'deepseek' | undefined;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash-exp';
const DEEPSEEK_MODEL_ID = process.env.DEEPSEEK_MODEL_ID || 'deepseek-chat';
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';

// Validate configuration
function validateConfig(): void {
  if (!AI_PROVIDER) {
    throw new Error('AI_PROVIDER must be set to "gemini" or "deepseek"');
  }

  if (AI_PROVIDER === 'gemini' && !GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required when AI_PROVIDER=gemini');
  }

  if (AI_PROVIDER === 'deepseek' && !DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is required when AI_PROVIDER=deepseek');
  }
}

// ============================================================================
// System Prompt (English)
// ============================================================================

const SYSTEM_PROMPT = `You are a sales intelligence analyst for KOBACO (Korea Broadcasting Advertising Corporation).

KOBACO provides:
- Advertising strategy consulting
- Media planning and buying
- Campaign effectiveness measurement
- Broadcasting advertising solutions

Your task is to analyze news articles and events to identify potential sales leads.

For each article, evaluate:
1. **Company/Organization name** mentioned
2. **Event summary** - what's happening
3. **Target audience** - who they're trying to reach
4. **ATV fit** - why KOBACO's advertising/media services would be valuable
5. **Sales angle** - specific approach for outreach
6. **AI Score (0-100)** - lead quality score based on:
   - Budget likelihood (are they spending money?)
   - Decision timeline (is action imminent?)
   - Service fit (do they need advertising/media?)
   - Contact opportunity (can we reach decision makers?)
7. **Contact Information** - Extract public contact info:
   - Representative Email (e.g., press@..., contact@...)
   - Representative Phone (e.g., 02-123-4567, 010-1234-5678)
   - PR Agency name (if mentioned as handling the press release)
   - Company Homepage URL

CRITICAL REQUIREMENTS:
- Output ONLY valid JSON
- NO markdown formatting
- NO code blocks
- NO extra text
- All field values MUST be in Korean (except email/phone/urls)
- Follow this EXACT schema:

{
  "company_name": "기업명",
  "event_summary": "이벤트 요약",
  "target_audience": "타겟 고객층",
  "atv_fit_reason": "KOBACO 서비스 적합 이유",
  "sales_angle": "영업 접근 방식",
  "ai_score": 75,
  "contact_email": "null 또는 이메일",
  "contact_phone": "null 또는 연락처",
  "pr_agency": "null 또는 대행사명",
  "homepage_url": "null 또는 URL"
}

If the article is not relevant to advertising/media/marketing, set ai_score to 0 but still provide analysis.`;

// ============================================================================
// AI Clients (Lazy Initialization)
// ============================================================================

let geminiClient: GoogleGenerativeAI | null = null;
let deepseekClient: OpenAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

function getDeepSeekClient(): OpenAI {
  if (!deepseekClient) {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY not configured');
    }
    deepseekClient = new OpenAI({
      apiKey: DEEPSEEK_API_KEY,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }
  return deepseekClient;
}

// ============================================================================
// JSON Parsing Utilities
// ============================================================================

/**
 * Extract JSON from response that might contain markdown or extra text
 */
function extractJSON(text: string): string {
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');

  // Try to find JSON object boundaries
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

/**
 * Parse and validate AI response
 */
function parseAndValidate(rawText: string): AIAnalysis {
  const jsonText = extractJSON(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(`JSON parse failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  // Handle nulls returned as strings
  if (parsed.contact_email === 'null') parsed.contact_email = null;
  if (parsed.contact_phone === 'null') parsed.contact_phone = null;
  if (parsed.pr_agency === 'null') parsed.pr_agency = null;
  if (parsed.homepage_url === 'null') parsed.homepage_url = null;

  // Validate with Zod
  const result = AIAnalysisSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(`Schema validation failed: ${result.error.message}`);
  }

  return result.data;
}

// ============================================================================
// AI Analysis Functions
// ============================================================================

/**
 * Analyze article using Gemini
 */
async function analyzeWithGemini(
  title: string,
  content: string,
  source: string
): Promise<AIAnalysis> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL_ID,
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json',
    },
  });

  const userPrompt = `Analyze this article for sales lead potential and contact info:

Title: ${title}
Content: ${content}
Source: ${source}

Provide analysis in the exact JSON format specified.`;

  const result = await model.generateContent({
    contents: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
  });

  const response = result.response;
  const text = response.text();

  return parseAndValidate(text);
}

/**
 * Analyze article using DeepSeek
 */
async function analyzeWithDeepSeek(
  title: string,
  content: string,
  source: string
): Promise<AIAnalysis> {
  const client = getDeepSeekClient();

  const userPrompt = `Analyze this article for sales lead potential and contact info:

Title: ${title}
Content: ${content}
Source: ${source}

Provide analysis in the exact JSON format specified.`;

  const response = await client.chat.completions.create({
    model: DEEPSEEK_MODEL_ID,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0]?.message?.content;

  if (!text) {
    throw new Error('No response from DeepSeek');
  }

  return parseAndValidate(text);
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Detect email using regex for fallback
 */
function detectEmail(text: string): string | null {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
}

/**
 * Detect Korean phone numbers using regex
 */
function detectPhone(text: string): string | null {
  // Matches: 02-123-4567, 010-1234-5678, 070-1234-5678, etc.
  const phoneRegex = /(0\d{1,2}-\d{3,4}-\d{4})/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0] : null;
}

/**
 * Detect URLs using regex
 */
function detectUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return null;

  // Exclude newswire links if searching for company homepage
  const filtered = matches.filter(url => !url.includes('newswire.co.kr'));
  return filtered.length > 0 ? filtered[0] : null;
}

/**
 * Analyze article with configured AI provider
 * Retries once with stronger reminder if parsing fails
 */
export async function analyzeArticle(
  title: string,
  content: string,
  source: string
): Promise<AIAnalysis> {
  validateConfig();

  const analyzeFn = AI_PROVIDER === 'gemini' ? analyzeWithGemini : analyzeWithDeepSeek;

  try {
    const analysis = await analyzeFn(title, content, source);

    // Regex Fallback
    if (!analysis.contact_email) {
      analysis.contact_email = detectEmail(content) || detectEmail(title);
    }
    if (!analysis.contact_phone) {
      analysis.contact_phone = detectPhone(content) || detectPhone(title);
    }
    if (!analysis.homepage_url) {
      analysis.homepage_url = detectUrl(content) || detectUrl(title);
    }

    return analysis;
  } catch (error) {
    // Retry once with stronger reminder
    console.warn('AI analysis failed, retrying with stronger prompt:', error);

    try {
      // Add stronger reminder to content
      const enhancedContent = `${content}\n\nREMINDER: Respond with ONLY valid JSON matching the schema. No markdown, no code blocks, no extra text.`;
      const analysis = await analyzeFn(title, enhancedContent, source);

      // Regex Fallback for Email
      if (!analysis.contact_email) {
        analysis.contact_email = detectEmail(content);
      }

      return analysis;
    } catch (retryError) {
      console.error('AI analysis failed after retry:', retryError);

      // Return fallback with score 0
      return {
        company_name: '분석 실패',
        event_summary: title,
        target_audience: '알 수 없음',
        atv_fit_reason: 'AI 분석 실패',
        sales_angle: '수동 검토 필요',
        ai_score: 0,
        contact_email: detectEmail(content),
        contact_phone: detectPhone(content),
        pr_agency: null,
        homepage_url: detectUrl(content),
      };
    }
  }
}

/**
 * Get current AI provider name
 */
export function getProviderName(): string {
  return AI_PROVIDER || 'not configured';
}
