'use client';

import React, { useState, useEffect, useRef } from 'react';

// Types
interface AIAnalysis {
  company_name: string;
  event_summary: string;
  target_audience: string;
  atv_fit_reason: string;
  sales_angle: string;
  ai_score: number;
  contact_email?: string | null;
  contact_phone?: string | null;
  pr_agency?: string | null;
  homepage_url?: string | null;
}

interface LeadState {
  lead_id: string;
  status: string;
  tags: string[];
  next_action?: string;
  assigned_to?: string;
  status_changed_at: number;
  last_contacted_at?: number;
  analyzed_at?: number;
}

const LeadStatus = {
  NEW: 'NEW',
  EXCLUDED: 'EXCLUDED',
  WON: 'WON',
  LOST: 'LOST',
};

interface Lead {
  lead_id: string;
  title: string;
  link: string;
  contentSnippet: string;
  pubDate: string;
  source: string;
  keyword?: string;
  ai_analysis: AIAnalysis;
  final_score: number;
  created_at: number;
  updated_at: number;
  state: LeadState;
  notes_count: number;
}

interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author?: string;
  created_at: number;
}

interface SalesConfig {
  naverClientId: string;
  naverClientSecret: string;
  naverEnabled?: boolean;
  keywords: string[];
  rssFeeds: Array<{
    category: string;
    originalUrl: string;
    url: string;
    title: string;
    enabled?: boolean;
  }>;
  minScore: number;
  leadNotificationsEnabled: boolean;
  minLeadScoreForNotify: number;
  excludedCompanies?: string[];
  excludedCompaniesTemporary?: Array<{ name: string; expiresAt: number }>;
}

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'IN_PROGRESS', 'ON_HOLD', 'WON', 'LOST', 'EXCLUDED', 'PERMANENT_EXCLUDED'];
const STATUS_LABELS: Record<string, string> = {
  ALL: '전체',
  NEW: '신규',
  CONTACTED: '연락완료',
  IN_PROGRESS: '진행중',
  ON_HOLD: '보류',
  WON: '성공',
  LOST: '실패',
  EXCLUDED: '제외',
  PERMANENT_EXCLUDED: '영구제외',
};

export default function SalesDashboardPage() {
  const [currentStatus, setCurrentStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('latest');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');

  const [scanning, setScanning] = useState(false);
  const [autoScanning, setAutoScanning] = useState(false);
  const autoScanRef = useRef(false);
  const [smartScanning, setSmartScanning] = useState(false);
  const smartScanRef = useRef(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [excludedCompanies, setExcludedCompanies] = useState<string[]>([]);

  // Helper for KST time formatting
  function formatKST(dateStr?: string | number) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const parts = new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul',
      }).formatToParts(date);

      const p: Record<string, string> = {};
      parts.forEach(part => p[part.type] = part.value);
      return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
    } catch {
      return '-';
    }
  }

  function handleCopyEmail(email: string) {
    navigator.clipboard.writeText(email);
    alert('이메일 주소가 복사되었습니다.');
  }

  function handleCopyPhone(phone: string) {
    navigator.clipboard.writeText(phone);
    alert('연락처가 복사되었습니다.');
  }

  const [scanLimit, setScanLimit] = useState(30);
  const [minScore, setMinScore] = useState(60);

  useEffect(() => {
    loadLeads(currentStatus, sortBy);
    if (currentStatus === 'PERMANENT_EXCLUDED') {
      setSelectedLeads(new Set());
    }
  }, [currentStatus, sortBy]);

  useEffect(() => {
    loadExcludedCompanies();
  }, []);

  useEffect(() => {
    if (selectedLead) {
      loadNotes(selectedLead.lead_id);
    }
  }, [selectedLead]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  async function loadLeads(status: string, sort: string = 'latest') {
    setLoading(true);
    try {
      if (status === 'PERMANENT_EXCLUDED') {
        setLeads([]);
        return;
      }

      const res = await fetch(`/api/sales/leads?status=${status}&sortBy=${sort}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (data.counts) {
          setStatusCounts(data.counts);
        }
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadExcludedCompanies() {
    try {
      const res = await fetch('/api/sales/config');
      if (res.ok) {
        const data = (await res.json()) as SalesConfig;
        setExcludedCompanies(data.excludedCompanies || []);
      }
    } catch (error) {
      console.error('Failed to load excluded companies:', error);
    }
  }

  async function handleScan() {
    setScanning(true);
    try {
      const res = await fetch(
        `/api/sales/scan?limit=${scanLimit}&minScore=${minScore}`,
        { method: 'POST' }
      );

      if (res.ok) {
        const data = await res.json();
        alert(
          `스캔 완료!\n분석: ${data.stats?.analyzed || 0}개\n필터 통과: ${data.stats?.passed_filter || 0
          }개`
        );
        loadLeads(currentStatus);
        setCooldown(30);
      } else {
        alert('스캔 실패');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert('스캔 중 오류 발생');
    } finally {
      setScanning(false);
    }
  }

  async function handleIncrementalScan(isAuto = false) {
    setScanning(true);
    setScanStatus('스캔 중...');
    try {
      const res = await fetch(`/api/sales/scan/cron?minScore=${minScore}`);
      if (res.ok) {
        const data = await res.json();
        const msg = `반영 완료: ${data.source || data.feed || '-'}`;
        setScanStatus(msg);

        if (!isAuto) {
          alert(
            `증분 스캔 완료!\n소스: ${data.source || data.feed || '-'}\n새 리드: ${data.newLeads || 0}개\n다음: ${data.nextSourceName || (data.nextSourceIndex + 1 + '번째')}`
          );
        }
        loadLeads(currentStatus);
        return data;
      } else {
        if (!isAuto) alert('증분 스캔 실패');
        return null;
      }
    } catch (error) {
      console.error('Incremental scan error:', error);
      if (!isAuto) alert('증분 스캔 중 오류 발생');
      return null;
    } finally {
      setScanning(false);
    }
  }

  async function handleAutoFullScan() {
    if (autoScanning) {
      setAutoScanning(false);
      autoScanRef.current = false;
      setScanStatus('스캔 중단됨');
      return;
    }

    setAutoScanning(true);
    autoScanRef.current = true;
    setScanStatus('자동 스캔 시작...');

    try {
      let currentIdx = -1;
      let total = 99; // Initial dummy
      let count = 0;

      while (count < total && autoScanRef.current) {
        setScanStatus(`스캔 중... (${count + 1}번째 소스)`);
        const result = await handleIncrementalScan(true);

        if (!result || !autoScanRef.current) {
          if (!autoScanRef.current) setScanStatus('스캔 중단됨');
          else setScanStatus('스캔 실패로 중단됨');
          break;
        }

        total = result.totalSources || 1;
        currentIdx = result.nextSourceIndex || 0;

        if (currentIdx === 0) {
          setScanStatus('전체 스캔 완료! ✅');
          break;
        }

        count++;
        // Wait 15 seconds with countdown
        for (let i = 15; i > 0; i--) {
          if (!autoScanRef.current) break;
          setScanStatus(`대기 중 (${i}초)... 다음: ${result.nextSourceName || (result.nextSourceIndex + 1 + '번째')}`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    } catch (err) {
      setScanStatus('오류 발생으로 중단됨');
    } finally {
      setAutoScanning(false);
      autoScanRef.current = false;
    }
  }

  async function handleSmartQueueScan() {
    if (smartScanning) {
      setSmartScanning(false);
      smartScanRef.current = false;
      setScanStatus('큐 처리 중단됨');
      return;
    }

    setSmartScanning(true);
    smartScanRef.current = true;
    setScanStatus('스마트 큐 처리 시작...');

    const MAX_ROUNDS = 20; // Max 20 rounds (safety limit)
    let round = 1;
    let totalProcessed = 0;

    try {
      while (round <= MAX_ROUNDS && smartScanRef.current) {
        setScanStatus(`큐 처리 중... (Round ${round})`);

        const res = await fetch(`/api/sales/scan/cron?minScore=${minScore}`);

        if (!res.ok) {
          setScanStatus('큐 처리 실패로 중단됨');
          break;
        }

        const data = await res.json();
        totalProcessed += data.processed || 0;

        // Update status with queue info
        setScanStatus(
          `Round ${round}: ${data.processed || 0}개 처리 (큐: ${data.queueLength || 0}개 남음)`
        );

        // Check if queue is empty or API says to stop
        if (!data.continue || data.queueLength === 0) {
          setScanStatus(`✅ 큐 처리 완료! (총 ${totalProcessed}개 처리)`);
          loadLeads(currentStatus);
          break;
        }

        round++;

        // Wait 2 seconds before next round (prevent rate limiting)
        if (smartScanRef.current && round <= MAX_ROUNDS) {
          for (let i = 2; i > 0; i--) {
            if (!smartScanRef.current) break;
            setScanStatus(`대기 중 (${i}초)... 큐: ${data.queueLength || 0}개`);
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      if (round > MAX_ROUNDS) {
        setScanStatus(`⚠️ 최대 라운드 도달 (${totalProcessed}개 처리). 나머지는 Cron이 처리합니다.`);
      }

      // Reload leads after completion
      loadLeads(currentStatus);
    } catch (err) {
      console.error('Smart queue scan error:', err);
      setScanStatus('오류 발생으로 중단됨');
    } finally {
      setSmartScanning(false);
      smartScanRef.current = false;
    }
  }

  async function handleDeleteLead(leadId: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/sales/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(leads.filter(l => l.lead_id !== leadId));
        if (selectedLeads.has(leadId)) {
          const next = new Set(selectedLeads);
          next.delete(leadId);
          setSelectedLeads(next);
        }
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }

  async function handleBulkDelete() {
    if (selectedLeads.size === 0) return;
    if (!confirm(`선택한 ${selectedLeads.size}개의 리드를 정말 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch('/api/sales/leads/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) }),
      });
      if (res.ok) {
        setLeads(leads.filter(l => !selectedLeads.has(l.lead_id)));
        setSelectedLeads(new Set());
      }
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  }

  function getSelectedLeadsInfo() {
    return leads.filter((lead) => selectedLeads.has(lead.lead_id));
  }

  function getSelectedCompanyNames() {
    const selected = getSelectedLeadsInfo();
    const seen = new Set<string>();
    const names: string[] = [];

    for (const lead of selected) {
      const name = lead.ai_analysis.company_name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }

    return names;
  }

  async function updateExcludedConfig(options: {
    permanent?: string[];
    replacePermanent?: string[];
    temporary?: Array<{ name: string; expiresAt: number }>;
  }) {
    const configRes = await fetch('/api/sales/config');
    if (!configRes.ok) {
      throw new Error('Failed to load config');
    }

    const config = (await configRes.json()) as SalesConfig;
    let permanent = config.excludedCompanies || [];
    const temporary = config.excludedCompaniesTemporary || [];

    if (options.replacePermanent) {
      permanent = options.replacePermanent;
    } else if (options.permanent) {
      const seen = new Set(permanent.map((name) => name.toLowerCase()));
      for (const name of options.permanent) {
        const key = name.toLowerCase();
        if (!seen.has(key)) {
          permanent.push(name);
          seen.add(key);
        }
      }
    }

    if (options.temporary) {
      const now = Date.now();
      const merged = new Map<string, { name: string; expiresAt: number }>();
      for (const item of temporary) {
        if (!item || item.expiresAt <= now) continue;
        merged.set(item.name.toLowerCase(), item);
      }
      for (const item of options.temporary) {
        if (!item.name || item.expiresAt <= now) continue;
        const key = item.name.toLowerCase();
        const existing = merged.get(key);
        if (!existing || existing.expiresAt < item.expiresAt) {
          merged.set(key, item);
        }
      }
      const updated = Array.from(merged.values());
      config.excludedCompaniesTemporary = updated;
    }

    const saveRes = await fetch('/api/sales/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        naverClientId: config.naverClientId,
        naverClientSecret: config.naverClientSecret,
        naverEnabled: config.naverEnabled,
        keywords: config.keywords,
        rssFeeds: config.rssFeeds,
        minScore: config.minScore,
        leadNotificationsEnabled: config.leadNotificationsEnabled,
        minLeadScoreForNotify: config.minLeadScoreForNotify,
        excludedCompanies: permanent,
        excludedCompaniesTemporary: config.excludedCompaniesTemporary,
      }),
    });

    if (!saveRes.ok) {
      throw new Error('Failed to save config');
    }

    setExcludedCompanies(permanent);
  }

  async function bulkUpdateStatus(status: string) {
    const leadIds = Array.from(selectedLeads);
    if (leadIds.length === 0) return;

    const res = await fetch('/api/sales/leads/bulk-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, status }),
    });

    if (!res.ok) {
      throw new Error('Failed to update lead status');
    }
  }

  async function handleBulkRestoreExcluded() {
    if (selectedLeads.size === 0) return;
    if (!confirm(`선택한 ${selectedLeads.size}개의 리드를 제외 해제하시겠습니까?`)) return;

    try {
      await bulkUpdateStatus('NEW');
      setSelectedLeads(new Set());
      loadLeads(currentStatus);
    } catch (error) {
      console.error('Bulk restore failed:', error);
      alert('제외 해제 처리 중 오류가 발생했습니다.');
    }
  }

  async function handleBulkTemporaryExclude(days: number) {
    if (selectedLeads.size === 0) return;
    if (!confirm(`선택한 ${selectedLeads.size}개의 리드를 ${days}일 제외하시겠습니까?`)) return;

    const companies = getSelectedCompanyNames();
    if (companies.length === 0) {
      alert('기업명이 없는 리드는 제외 목록에 추가할 수 없습니다.');
      return;
    }

    try {
      const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
      await updateExcludedConfig({
        temporary: companies.map((name) => ({ name, expiresAt })),
      });
      await bulkUpdateStatus('EXCLUDED');
      setSelectedLeads(new Set());
      loadLeads(currentStatus);
    } catch (error) {
      console.error('Bulk temporary exclude failed:', error);
      alert('일시 제외 처리 중 오류가 발생했습니다.');
    }
  }

  async function handleBulkPermanentExclude() {
    if (selectedLeads.size === 0) return;
    if (!confirm(`선택한 ${selectedLeads.size}개의 리드를 영구 제외하시겠습니까?`)) return;

    const companies = getSelectedCompanyNames();
    if (companies.length === 0) {
      alert('기업명이 없는 리드는 제외 목록에 추가할 수 없습니다.');
      return;
    }

    try {
      await updateExcludedConfig({ permanent: companies });
      await bulkUpdateStatus('EXCLUDED');
      setSelectedLeads(new Set());
      loadLeads(currentStatus);
    } catch (error) {
      console.error('Bulk permanent exclude failed:', error);
      alert('영구 제외 처리 중 오류가 발생했습니다.');
    }
  }

  async function handleBulkPermanentRestore() {
    if (selectedLeads.size === 0) return;
    if (!confirm(`선택한 ${selectedLeads.size}개의 리드를 영구 제외 해제하시겠습니까?`)) return;

    const companies = getSelectedCompanyNames();
    if (companies.length === 0) {
      alert('기업명이 없는 리드는 제외 해제할 수 없습니다.');
      return;
    }

    try {
      const remaining = excludedCompanies.filter(
        (company) => !companies.some((name) => name.toLowerCase() === company.toLowerCase())
      );
      await updateExcludedConfig({ replacePermanent: remaining });
      await bulkUpdateStatus('NEW');
      setSelectedLeads(new Set());
      loadLeads(currentStatus);
    } catch (error) {
      console.error('Bulk permanent restore failed:', error);
      alert('영구 제외 해제 처리 중 오류가 발생했습니다.');
    }
  }

  function toggleSelectAll() {
    if (selectedLeads.size === leads.length && leads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l.lead_id)));
    }
  }

  function toggleSelectLead(id: string) {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  }

  async function loadNotes(leadId: string) {
    try {
      const res = await fetch(`/api/sales/leads/${leadId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  }

  async function handleAddNote() {
    if (!selectedLead || !newNote.trim()) return;

    try {
      const res = await fetch(`/api/sales/leads/${selectedLead.lead_id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (res.ok) {
        setNewNote('');
        loadNotes(selectedLead.lead_id);
        loadLeads(currentStatus);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!selectedLead) return;

    try {
      const res = await fetch(
        `/api/sales/leads/${selectedLead.lead_id}/state`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (res.ok) {
        loadLeads(currentStatus);
        setSelectedLead({ ...selectedLead, state: { ...selectedLead.state, status: newStatus } });
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  async function handleExcludeLead(lead: Lead) {
    const nextStatus = lead.state.status === LeadStatus.EXCLUDED ? 'NEW' : 'EXCLUDED';
    try {
      const res = await fetch(`/api/sales/leads/${lead.lead_id}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        loadLeads(currentStatus);
      }
    } catch (error) {
      console.error('Failed to update exclude status:', error);
    }
  }

  async function handlePermanentExclude(lead: Lead) {
    const company = lead.ai_analysis.company_name?.trim();
    if (!company) {
      alert('기업명이 없어 영구 제외에 추가할 수 없습니다.');
      return;
    }

    try {
      const lowerCompany = company.toLowerCase();
      const isExcluded = excludedCompanies.some(
        (name) => name.toLowerCase() === lowerCompany
      );

      if (isExcluded) {
        const remaining = excludedCompanies.filter(
          (name) => name.toLowerCase() !== lowerCompany
        );
        await updateExcludedConfig({ replacePermanent: remaining });
        if (lead.state.status === LeadStatus.EXCLUDED) {
          await handleExcludeLead(lead);
        }
      } else {
        await updateExcludedConfig({ permanent: [company] });
        if (lead.state.status !== LeadStatus.EXCLUDED) {
          await handleExcludeLead(lead);
        }
      }

      loadLeads(currentStatus);
    } catch (error) {
      console.error('Failed to permanently exclude company:', error);
      alert('영구 제외 처리 중 오류가 발생했습니다.');
    }
  }

  async function handleRemovePermanentCompany(company: string) {
    const remaining = excludedCompanies.filter(
      (name) => name.toLowerCase() !== company.toLowerCase()
    );
    try {
      await updateExcludedConfig({ replacePermanent: remaining });
    } catch (error) {
      console.error('Failed to remove permanent exclusion:', error);
      alert('영구 제외 해제 중 오류가 발생했습니다.');
    }
  }

  async function handleUpdateAssignedTo(assignedTo: string) {
    if (!selectedLead) return;

    try {
      const res = await fetch(
        `/api/sales/leads/${selectedLead.lead_id}/state`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_to: assignedTo }),
        }
      );

      if (res.ok) {
        loadLeads(currentStatus);
        setSelectedLead({ ...selectedLead, state: { ...selectedLead.state, assigned_to: assignedTo } });
      }
    } catch (error) {
      console.error('Failed to update assigned_to:', error);
    }
  }

  const generatePrompt = (lead: Lead) => {
    return `
[역할]
당신은 B2B 전문 세일즈 카피라이터입니다. 정중하고 설득력 있는 톤앤매너를 유지하세요.

[상황]
저는 한국방송광고진흥공사(KOBACO)의 미디어 컨설턴트입니다.
현재 '${lead.ai_analysis.company_name}'의 마케팅 담당자에게 '어드레서블 TV(Addressable TV)' 광고 상품을 제안하려 합니다.

[타겟 기업 정보]
- 기업명: ${lead.ai_analysis.company_name}
- 최근 이슈: ${lead.ai_analysis.event_summary}
- 예상 타겟: ${lead.ai_analysis.target_audience}

[제안 핵심 논리 (Sales Angle)]
"${lead.ai_analysis.sales_angle}"
- KOBACO의 어드레서블 TV는 지상파 수준의 신뢰도를 갖추면서도, 원하는 타겟(지역/성별/관심사)에게만 송출하여 예산을 절감할 수 있습니다.
- 상세 서비스 안내 및 제안서 확인: https://kobaco-addr.vercel.app/

[요청사항]
위 정보를 바탕으로, 담당자가 이 메일을 읽고 "한번 만나서 들어보고 싶다"는 생각이 들도록 매력적인 콜드메일 초안을 작성해주세요.
1. 클릭을 유도하는 매력적인 메일 제목 후보 3가지를 먼저 제시해주세요.
2. 본문은 문제 제기 -> 공감 -> 솔루션 제시(KOBACO ATV) -> 미팅 제안(Call to Action) 구조로 작성해주세요.
3. 메일 작성 시 ** 기호 등 마크다운 서식을 절대 사용하지 말고, 순수 텍스트로만 작성해주세요.
`.trim();
  };

  const handleCopyPrompt = (lead: Lead) => {
    const prompt = generatePrompt(lead);
    navigator.clipboard.writeText(prompt);
    alert("ChatGPT용 프롬프트가 복사되었습니다! AI 채팅창에 붙여넣으세요.");
  };

  const selectedCompanyNames = getSelectedCompanyNames();
  const hasExcludedSelected = leads.some(
    (lead) => selectedLeads.has(lead.lead_id) && lead.state.status === LeadStatus.EXCLUDED
  );
  const hasPermanentSelected = selectedCompanyNames.some((name) =>
    excludedCompanies.some((company) => company.toLowerCase() === name.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">

      {/* Scan Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleIncrementalScan(false)}
            disabled={scanning}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            title="피드별로 순차 스캔 (60초 타임아웃 방지)"
          >
            {scanning ? '스캔 중...' : '📥 리드 스캔'}
          </button>

          <button
            onClick={handleAutoFullScan}
            disabled={scanning && !autoScanning}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors text-sm ${autoScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {autoScanning ? '🛑 자동 스캔 중단' : '🔥 자동 전체 스캔'}
          </button>

          <button
            onClick={handleSmartQueueScan}
            disabled={(scanning || autoScanning) && !smartScanning}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors text-sm shadow-md ${smartScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            title="큐에 쌓인 항목들을 Time-Budget 방식으로 빠르게 처리 (50초씩 최대한 처리)"
          >
            {smartScanning ? '🛑 큐 처리 중단' : '⚡ 스마트 큐 처리'}
          </button>

          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">최소 점수</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {scanStatus && (
            <span className="text-xs font-semibold text-blue-600 animate-pulse">
              {scanStatus}
            </span>
          )}

          <span className="text-xs text-gray-400 ml-auto hidden sm:inline">
            ⚡ 스마트 큐 처리: Time-Budget (50초) 활용하여 고속 처리
          </span>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 flex-shrink-0 flex items-center justify-between">
        <div className="flex overflow-x-auto">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => {
                setCurrentStatus(status);
                loadLeads(status);
              }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${currentStatus === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              {STATUS_LABELS[status]}
              <span className="ml-2 text-[10px] font-semibold text-gray-400">
                {status === 'PERMANENT_EXCLUDED'
                  ? excludedCompanies.length
                  : statusCounts[status] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6 min-h-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
          {/* Leads List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-0">
            <div className="p-4 border-b border-gray-200 flex flex-col gap-3 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">
                  리드 목록 ({leads.length})
                </h2>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setSortBy('latest')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${sortBy === 'latest' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    최신순
                  </button>
                  <button
                    onClick={() => setSortBy('score')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${sortBy === 'score' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    점수순
                  </button>
                </div>
              </div>

              {currentStatus !== 'PERMANENT_EXCLUDED' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm">
                    <input
                      type="checkbox"
                      id="selectAllLeads"
                      checked={leads.length > 0 && selectedLeads.size === leads.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="selectAllLeads" className="text-xs font-bold text-gray-700 cursor-pointer select-none">전체 선택</label>
                  </div>

                  <div className="text-[10px] text-gray-400 font-medium">
                    {sortBy === 'score' ? '* 점수 상위 200개 중 정렬' : '* 최신 50개 표시'}
                  </div>
                </div>
              )}
            </div>

            {currentStatus === 'PERMANENT_EXCLUDED' ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-xs font-semibold text-gray-500 mb-3">
                  영구 제외 기업 ({excludedCompanies.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {excludedCompanies.length === 0 ? (
                    <span className="text-xs text-gray-400">등록된 기업 없음</span>
                  ) : (
                    excludedCompanies.map((company, index) => (
                      <span
                        key={`${company}-${index}`}
                        className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-gray-100 text-gray-600"
                      >
                        {company}
                        <button
                          onClick={() => handleRemovePermanentCompany(company)}
                          className="text-gray-400 hover:text-red-600"
                          title="영구 제외 해제"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
              {loading ? (
                <div className="p-8 text-center text-gray-500">로딩 중...</div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  리드가 없습니다. 스캔을 실행하세요.
                </div>
              ) : (
                leads.map((lead) => {
                  const isExcluded = lead.state.status === LeadStatus.EXCLUDED;
                  const isPermanentExcluded = excludedCompanies.some(
                    (company) =>
                      company.toLowerCase() === lead.ai_analysis.company_name?.trim().toLowerCase()
                  );

                  return (
                    <div
                      key={lead.lead_id}
                      className={`border-b border-gray-100 hover:bg-slate-50 transition-colors group relative flex items-center ${selectedLeads.has(lead.lead_id) ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="pl-4 pr-2 py-4 flex items-center h-full">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead.lead_id)}
                          onChange={() => toggleSelectLead(lead.lead_id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div
                        className="flex-1 px-4 py-4 cursor-pointer"
                        onClick={() => {
                          setSelectedLead(lead);
                          loadNotes(lead.lead_id);
                        }}
                      >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                            {lead.ai_analysis.company_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {lead.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black shadow-sm">
                              {lead.final_score}점
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${lead.state.status === LeadStatus.EXCLUDED
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                              {STATUS_LABELS[lead.state.status]}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                              🔍 {lead.source}
                            </span>
                            {lead.keyword && (
                              <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold border border-orange-100">
                                # {lead.keyword}
                              </span>
                            )}
                            {lead.state.assigned_to && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                {lead.state.assigned_to}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">
                              {formatKST(lead.state.analyzed_at || lead.created_at)}
                            </span>
                            {lead.notes_count > 0 && (
                              <>
                                <span className="text-[10px] text-gray-400">•</span>
                                <span className="text-[10px] text-gray-500">💬 {lead.notes_count}</span>
                              </>
                            )}
                          </div>

                          {/* Contact Bar */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-gray-50">
                            {lead.ai_analysis.pr_agency ? (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded border border-yellow-100">
                                📣 PR: {lead.ai_analysis.pr_agency}
                              </span>
                            ) : null}

                            {lead.ai_analysis.contact_email ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyEmail(lead.ai_analysis.contact_email!);
                                }}
                                className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                title="이메일 복사"
                              >
                                ✉️ {lead.ai_analysis.contact_email}
                              </button>
                            ) : null}

                            {lead.ai_analysis.contact_phone ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyPhone(lead.ai_analysis.contact_phone!);
                                }}
                                className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100 hover:bg-green-100 transition-colors"
                                title="연락처 복사"
                              >
                                📞 {lead.ai_analysis.contact_phone}
                              </button>
                            ) : null}

                            {lead.ai_analysis.homepage_url ? (
                              <a
                                href={lead.ai_analysis.homepage_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-50 text-slate-700 text-[10px] font-bold rounded border border-slate-100 hover:bg-slate-100 transition-colors"
                              >
                                🌐 홈페이지
                              </a>
                            ) : null}

                            {!lead.ai_analysis.contact_email && !lead.ai_analysis.homepage_url && (
                              <span className="text-[10px] text-orange-400 font-medium italic">
                                ⚠️ 홈페이지 확인 필요
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExcludeLead(lead);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all text-xs font-semibold ${isExcluded
                              ? 'bg-orange-50 text-orange-600 border-orange-200'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                              }`}
                            title={isExcluded ? '제외 해제' : '제외'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            {isExcluded ? '제외 해제' : '제외'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePermanentExclude(lead);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all text-xs font-semibold ${isPermanentExcluded
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:text-red-600'
                              }`}
                            title={isPermanentExcluded ? '영구 제외 해제' : '영구 제외'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 4h.01M9.172 9.172a4 4 0 015.656 0m0 0L12 12m2.828-2.828a4 4 0 010 5.656M6 6l12 12" />
                            </svg>
                            {isPermanentExcluded ? '영구 제외 해제' : '영구 제외'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.lead_id);
                            }}
                            className="p-1.5 bg-white text-gray-400 border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-600 transition-all"
                            title="삭제"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </div>
            )}
          </div>

          {/* Lead Detail */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-0">
            {selectedLead ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="bg-blue-600 text-white text-xs font-black px-2 py-1 rounded-lg shadow-sm">
                      {selectedLead.final_score}점
                    </span>
                    {selectedLead.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <select
                      value={selectedLead.state.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      {STATUSES.filter((s) => s !== 'ALL' && s !== 'PERMANENT_EXCLUDED').map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="담당자"
                      defaultValue={selectedLead.state.assigned_to || ''}
                      onBlur={(e) => handleUpdateAssignedTo(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-24"
                    />

                    <span className="text-[10px] text-gray-400 hidden lg:inline pt-1.5">
                      → 담당자 지정 및 리드 분류
                    </span>
                  </div>

                  <a
                    href={selectedLead.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    원문 보기 →
                  </a>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {/* Metadata Bar */}
                  <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">수집 출처</span>
                      <span className="text-xs font-bold text-slate-700 truncate">{selectedLead.source}</span>
                    </div>
                    {selectedLead.keyword && (
                      <>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">검색 키워드</span>
                          <span className="text-xs font-bold text-orange-600 truncate">{selectedLead.keyword}</span>
                        </div>
                      </>
                    )}
                    <div className="h-6 w-px bg-slate-200 mx-1 ml-auto"></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">게시일</span>
                      <span className="text-xs font-bold text-slate-700">{formatKST(selectedLead.pubDate)}</span>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-semibold text-gray-700">회사명</div>
                      <div className="text-gray-900">
                        {selectedLead.ai_analysis.company_name}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-gray-700">이벤트 요약</div>
                      <div className="text-gray-900">
                        {selectedLead.ai_analysis.event_summary}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-gray-700">타겟 고객층</div>
                      <div className="text-gray-900">
                        {selectedLead.ai_analysis.target_audience}
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-gray-700">적합 이유</div>
                      <div className="text-gray-900">
                        {selectedLead.ai_analysis.atv_fit_reason}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                          🤖 AI Agent Prompt
                          <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-full font-normal italic">ChatGPT용</span>
                        </div>
                        <button
                          onClick={() => handleCopyPrompt(selectedLead)}
                          className="text-xs px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <span>📋 프롬프트 복사</span>
                        </button>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm text-slate-600 leading-relaxed">
                        <p className="font-semibold text-slate-800 mb-1">💡 Sales Angle:</p>
                        {selectedLead.ai_analysis.sales_angle}
                        <p className="text-xs text-slate-400 mt-2 border-t border-slate-200 pt-2">
                          * '프롬프트 복사' 버튼을 누르면, 이 내용을 바탕으로 메일을 써주는 전체 명령어가 복사됩니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">
                      메모 ({notes.length})
                    </h3>

                    <div className="space-y-2 mb-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 bg-gray-50 rounded-lg text-sm"
                        >
                          <div className="text-gray-900">{note.content}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(note.created_at).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === 'Enter' && handleAddNote()
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="메모 추가..."
                      />
                      <button
                        onClick={handleAddNote}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                리드를 선택하세요
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Floating Bulk Action Bar */}
      {
        selectedLeads.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-[10px] font-bold px-2 py-1 rounded-full">{selectedLeads.size}</span>
              <span className="text-sm font-medium">개 리드 선택됨</span>
            </div>

            <div className="flex items-center gap-2 border-l border-gray-700 pl-8">
              <button
                onClick={() => handleBulkTemporaryExclude(7)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white rounded-lg transition-all text-xs font-semibold"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                7일 제외
              </button>
              <button
                onClick={handleBulkPermanentExclude}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white rounded-lg transition-all text-xs font-semibold"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                영구 제외
              </button>
              {hasExcludedSelected && (
                <button
                  onClick={handleBulkRestoreExcluded}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition-all text-xs font-semibold"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8m0 0l-3 3m3-3l3 3m-3-3a8 8 0 018 8" />
                  </svg>
                  제외 해제
                </button>
              )}
              {hasPermanentSelected && (
                <button
                  onClick={handleBulkPermanentRestore}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition-all text-xs font-semibold"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  영구 제외 해제
                </button>
              )}
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all text-xs font-semibold"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                </svg>
                선택 삭제
              </button>

              <button
                onClick={() => setSelectedLeads(new Set())}
                className="px-3 py-2 text-gray-400 hover:text-white transition-colors text-xs"
              >
                취소
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}
