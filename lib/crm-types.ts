/**
 * CRM Types and Utilities for KOBACO Advertiser Discovery Bot
 * Phase 2 Mini CRM Data Model
 */

import { createHash } from 'crypto';
import { z } from 'zod';

// ============================================================================
// Status Enum
// ============================================================================

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  IN_PROGRESS: 'IN_PROGRESS',
  ON_HOLD: 'ON_HOLD',
  WON: 'WON',
  LOST: 'LOST',
  EXCLUDED: 'EXCLUDED',
} as const;

export type LeadStatusType = typeof LeadStatus[keyof typeof LeadStatus];

export const ALL_STATUSES: LeadStatusType[] = Object.values(LeadStatus);

// ============================================================================
// Zod Schemas
// ============================================================================

export const AIAnalysisSchema = z.object({
  company_name: z.string(),
  event_summary: z.string(),
  target_audience: z.string(),
  atv_fit_reason: z.string(),
  sales_angle: z.string(),
  ai_score: z.number().min(0).max(100),
  contact_email: z.string().optional().nullable(),
  contact_phone: z.string().optional().nullable(),
  pr_agency: z.string().optional().nullable(),
  homepage_url: z.string().optional().nullable(),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

// ============================================================================
// Lead Core Data
// ============================================================================

export interface LeadCore {
  lead_id: string;
  title: string;
  link: string;
  contentSnippet: string;
  pubDate: string;
  source: string; // 'RSS' | 'NAVER'
  keyword?: string;

  // AI Analysis
  ai_analysis: AIAnalysis;

  // Contact Info (Extracted)
  contact?: {
    email?: string;
    phone?: string;
    pr_agency?: string;
    homepage?: string;
    source?: 'NEWS' | 'HOMEPAGE' | 'MANUAL';
  };

  // Scoring
  final_score: number;

  // Timestamps
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

// ============================================================================
// Lead State (CRM)
// ============================================================================

export interface LeadState {
  lead_id: string;
  status: LeadStatusType;
  tags: string[];
  next_action?: string;
  assigned_to?: string;

  // Timestamps
  status_changed_at: number;
  last_contacted_at?: number;
}

// ============================================================================
// Lead Note
// ============================================================================

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author?: string;
  created_at: number;
}

// ============================================================================
// Combined Lead (for UI)
// ============================================================================

export interface Lead extends LeadCore {
  state: LeadState;
  notes_count: number;
}

// ============================================================================
// Redis Key Patterns
// ============================================================================

export const RedisKeys = {
  // Lead data
  leadCore: (leadId: string) => `sales:lead:${leadId}`,
  leadState: (leadId: string) => `sales:leadstate:${leadId}`,
  leadNotes: (leadId: string) => `sales:leadnotes:${leadId}`,

  // Indices (sorted sets by score = timestamp)
  idxAll: () => `sales:idx:all`,
  idxStatus: (status: LeadStatusType) => `sales:idx:status:${status}`,

  // Cache
  scanCache: (limit: number, minScore: number) =>
    `sales:leads:scan:limit=${limit}:min=${minScore}`,
  scanList: (token: string) => `sales:leads:scan:list:${token}`,
  scanMeta: (token: string) => `sales:leads:scan:meta:${token}`,

  // Config
  config: () => `config:sales:settings`,
} as const;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate deterministic lead ID from link
 */
export function generateLeadId(link: string): string {
  const normalized = link.trim().toLowerCase();
  return createHash('sha1').update(normalized).digest('hex');
}

/**
 * Normalize link (prioritize originallink for Naver)
 */
export function normalizeLink(item: any): string {
  // For Naver items, prefer originallink
  if (item.originallink && item.originallink.trim()) {
    return item.originallink.trim();
  }
  return item.link?.trim() || '';
}

/**
 * Strip HTML tags from string
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Calculate recency bonus
 */
export function getRecencyBonus(pubDate: string): number {
  try {
    const published = new Date(pubDate).getTime();
    const now = Date.now();
    const ageMs = now - published;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays < 1) return 10;
    if (ageDays < 3) return 5;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Calculate final score
 */
export function calculateFinalScore(
  aiScore: number,
  recencyBonus: number,
  sourceBonus: number
): number {
  const base = aiScore * 0.6;
  const total = base + recencyBonus + sourceBonus;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(total)));
}

/**
 * Validate status
 */
export function isValidStatus(status: string): status is LeadStatusType {
  return ALL_STATUSES.includes(status as LeadStatusType);
}

/**
 * Create initial LeadState
 */
export function createInitialState(leadId: string): LeadState {
  return {
    lead_id: leadId,
    status: LeadStatus.NEW,
    tags: [],
    status_changed_at: Date.now(),
  };
}
