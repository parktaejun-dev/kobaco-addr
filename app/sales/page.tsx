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
}

interface LeadState {
  lead_id: string;
  status: string;
  tags: string[];
  next_action?: string;
  assigned_to?: string;
  status_changed_at: number;
  last_contacted_at?: number;
}

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

      {/* Status Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setCurrentStatus(status)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${currentStatus === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
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
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                리드 목록 ({leads.length})
              </h2>
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
                  <button
                    key={lead.lead_id}
                    onClick={() => setSelectedLead(lead)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedLead?.lead_id === lead.lead_id ? 'bg-blue-50' : ''
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                        {lead.title}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${lead.state.status === 'NEW' ? 'bg-green-100 text-green-700' :
                          lead.state.status === 'CONTACTED' ? 'bg-blue-100 text-blue-700' :
                            lead.state.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                              lead.state.status === 'WON' ? 'bg-emerald-100 text-emerald-700' :
                                lead.state.status === 'LOST' ? 'bg-red-100 text-red-700' :
                                  lead.state.status === 'EXCLUDED' ? 'bg-gray-100 text-gray-500' :
                                    'bg-gray-100 text-gray-600'
                          }`}>
                          {STATUS_LABELS[lead.state.status] || lead.state.status}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded">
                          {lead.final_score}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs text-gray-600">
                        {lead.ai_analysis.company_name}
                      </div>
                      {lead.state.status !== 'EXCLUDED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExcludeLead(lead.lead_id);
                          }}
                          className="text-[10px] px-1.5 py-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="제외 (부적합)"
                        >
                          ✕ 제외
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <span>{lead.source}</span>
                      <span>•</span>
                      <span>{new Date(lead.pubDate).toLocaleDateString()}</span>
                      {lead.state.assigned_to && (
                        <>
                          <span>•</span>
                          <span>👤 {lead.state.assigned_to}</span>
                        </>
                      )}
                      {lead.notes_count > 0 && (
                        <>
                          <span>•</span>
                          <span>💬 {lead.notes_count}</span>
                        </>
                      )}
                    </div>
                  </button>
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
        </div>
      </div>
    </div>
  );
}
