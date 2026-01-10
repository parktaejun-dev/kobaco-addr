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

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'IN_PROGRESS', 'ON_HOLD', 'WON', 'LOST', 'EXCLUDED'];
const STATUS_LABELS: Record<string, string> = {
  ALL: '전체',
  NEW: '신규',
  CONTACTED: '연락완료',
  IN_PROGRESS: '진행중',
  ON_HOLD: '보류',
  WON: '성공',
  LOST: '실패',
  EXCLUDED: '제외',
};

export default function SalesDashboardPage() {
  const [currentStatus, setCurrentStatus] = useState('ALL');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [newNote, setNewNote] = useState('');

  const [scanning, setScanning] = useState(false);
  const [autoScanning, setAutoScanning] = useState(false);
  const autoScanRef = useRef(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

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

  const [scanLimit, setScanLimit] = useState(30);
  const [minScore, setMinScore] = useState(60);

  useEffect(() => {
    loadLeads(currentStatus);
  }, [currentStatus]);

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

  async function loadLeads(status: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales/leads?status=${status}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
      }
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
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
            `증분 스캔 완료!\n소스: ${data.source || data.feed || '-'}\n새 리드: ${data.newLeads || 0}개\n다음: ${(data.nextSourceIndex || 0) + 1}번째`
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
          setScanStatus(`대기 중 (${i}초)... 다음 소스: ${currentIdx + 1}번째`);
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

  async function handleExcludeLead(leadId: string) {
    try {
      const res = await fetch(`/api/sales/leads/${leadId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'EXCLUDED' }),
      });

      if (res.ok) {
        loadLeads(currentStatus);
      }
    } catch (error) {
      console.error('Failed to exclude lead:', error);
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

  function copySalesScript() {
    if (!selectedLead) return;

    const script = `
[KOBACO 영업 스크립트]

회사명: ${selectedLead.ai_analysis.company_name}
이벤트: ${selectedLead.ai_analysis.event_summary}

타겟 고객층: ${selectedLead.ai_analysis.target_audience}
적합 이유: ${selectedLead.ai_analysis.atv_fit_reason}

영업 접근법:
${selectedLead.ai_analysis.sales_angle}

출처: ${selectedLead.link}
    `.trim();

    navigator.clipboard.writeText(script);
    alert('스크립트가 클립보드에 복사되었습니다.');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">KOBACO Lead Sniper</h1>
          <button
            onClick={() => (window.location.href = '/sales/settings')}
            className="text-sm text-blue-600 hover:underline"
          >
            설정
          </button>
        </div>
      </div>

      {/* Scan Controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
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
            Vercel 60초 제한을 피하기 위해 15초 간격으로 순차 스캔합니다.
          </span>
        </div>
      </div>

      {/* Status Tabs with Select All */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center justify-between">
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
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Leads List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">
                리드 목록 ({leads.length})
              </h2>
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
            </div>

            <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">로딩 중...</div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  리드가 없습니다. 스캔을 실행하세요.
                </div>
              ) : (
                leads.map((lead) => (
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
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${lead.state.status === LeadStatus.EXCLUDED
                              ? 'bg-gray-100 text-gray-600 border-gray-200'
                              : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                              {STATUS_LABELS[lead.state.status]}
                            </span>
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
                              handleExcludeLead(lead.lead_id);
                            }}
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all text-xs font-semibold ${lead.state.status === LeadStatus.EXCLUDED
                              ? 'bg-orange-50 text-orange-600 border-orange-200'
                              : 'bg-white text-gray-400 border-gray-200 hover:border-orange-300 hover:text-orange-600'
                              }`}
                            title="제외"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            제외
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
                ))
              )}
            </div>
          </div>

          {/* Lead Detail */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {selectedLead ? (
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 mb-2">
                    {selectedLead.title}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <select
                      value={selectedLead.state.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                    >
                      {STATUSES.filter((s) => s !== 'ALL').map((status) => (
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

                    <button
                      onClick={copySalesScript}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      title="클립보드에 복사 → 이메일, 문자, CRM에 붙여넣기"
                    >
                      📋 스크립트 복사
                    </button>
                    <span className="text-[10px] text-gray-400 hidden lg:inline">
                      → 이메일/문자에 붙여넣기
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

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

                    <div>
                      <div className="font-semibold text-gray-700">영업 접근법</div>
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {selectedLead.ai_analysis.sales_angle}
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
        </div >
      </div >
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
