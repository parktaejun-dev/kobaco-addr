"use client";

import { useState, useEffect } from 'react';
import { calculateEstimate, EstimateRequest, EstimateResult } from '@/lib/calculator';
import { Segment } from '@/lib/ai-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccordionSection } from '@/components/Accordion';
import { AIRecommendation } from '@/components/AIRecommendation';
import Footer from '@/components/Footer';
import {
  FileText, Target, Settings, Wallet, BarChart3,
  ExternalLink, Sparkles, AlertCircle, Printer,
  ArrowUpRight
} from 'lucide-react';

export default function EstimatePage() {
  const router = useRouter();
  const [result, setResult] = useState<EstimateResult | null>(null);

  const [formData, setFormData] = useState<EstimateRequest>({
    selected_channels: ['MBC', 'EBS', 'PP'],
    channel_budgets: { 'MBC': 1500, 'EBS': 1000, 'PP': 2500 },
    duration: 3,
    region_targeting: false,
    region_selections: {},
    audience_targeting: true,
    ad_duration: 15,
    custom_targeting: false,
    is_new_advertiser: true,
  });

  // Client info
  const [clientInfo, setClientInfo] = useState({
    advertiserName: '',
    productName: '',
    url: ''
  });

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    segments: Segment[];
    understanding: string;
    keywords: string[];
  } | null>(null);
  const [numRecommendations, setNumRecommendations] = useState(5);

  // Load saved data if exists (for back navigation from print)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedData = localStorage.getItem('kobaco_estimate_data');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Only restore if data looks valid
        if (parsed.form) setFormData(parsed.form);
        if (parsed.info) setClientInfo(parsed.info);
        if (parsed.result) setResult(parsed.result);
        if (parsed.aiResult) setAiResult(parsed.aiResult);
      }
    } catch (e) {
      console.error("Failed to load saved data:", e);
    }
  }, []);

  // Calculate estimate whenever form changes
  useEffect(() => {
    const res = calculateEstimate(formData);
    setResult(res);
  }, [formData]);

  const handleBudgetChange = (channel: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      channel_budgets: {
        ...prev.channel_budgets,
        [channel]: numVal
      },
      selected_channels: numVal > 0
        ? Array.from(new Set([...prev.selected_channels, channel]))
        : prev.selected_channels.filter(c => c !== channel)
    }));
  };

  const handleAIAnalysis = async () => {
    if (!clientInfo.productName.trim()) {
      alert('제품명을 입력해주세요.');
      return;
    }

    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: clientInfo.productName,
          website_url: clientInfo.url,
          num_recommendations: numRecommendations,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI 분석 실패');
      }

      const data = await response.json();
      setAiResult(data);

      // Log usage (Analysis)
      fetch('/api/log/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advertiser: clientInfo.advertiserName,
          product: clientInfo.productName,
          budget: result?.summary.total_budget,
          cpv: result?.summary.average_cpv,
          type: 'analysis'
        })
      }).catch(err => console.error('Logging failed:', err));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const goToPrint = () => {
    try {
      localStorage.setItem('kobaco_estimate_data', JSON.stringify({
        form: formData,
        info: clientInfo,
        result,
        aiResult
      }));
      // Open in new window
      window.open('/estimate/print', '_blank');
    } catch (e) {
      console.error("Failed to save estimate data:", e);
      alert("데이터 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.");
    }
  };

  const totalBudget = Object.values(formData.channel_budgets).reduce((a, b) => a + b, 0);
  const hasProductInfo = clientInfo.productName.trim().length > 0;
  const hasAIResult = !!(aiResult && aiResult.segments.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img
              src="https://n2wpsx55oxsmnkaa.public.blob.vercel-storage.com/webpage/logo_red.png"
              alt="KOBACO Addressable TV"
              className="h-6 md:h-7"
            />
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="https://drive.google.com/file/d/1iyZCKQSYvrxazfxaz4F5Eh2ejjfWbZUw/view?usp=sharing"
              target="_blank"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              소개자료
            </a>
            <a
              href="https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7"
              target="_blank"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Sparkles size={14} className="text-slate-300" /> AI 질문하기
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 pb-24">
        <div className="mb-12 pt-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
            견적 시뮬레이터
          </h1>
          <p className="text-lg text-slate-600 font-medium max-w-2xl">
            AI 기반 데이터 분석을 통해 최적의 어드레서블 TV 광고 캠페인을 설계하세요.
          </p>
        </div>

        <div className="space-y-6">
          {/* Section 1: Basic Info */}
          <AccordionSection
            title="광고 캠페인 기본 정보"
            defaultOpen={true}
            icon={<FileText size={18} />}
          >
            {/* ... Content ... */}
            <p className="text-sm text-gray-500 mb-4">
              광고 제품명과 URL을 입력해주시면, AI가 적합한 타깃을 추천해 드립니다.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">광고주*</label>
                <input
                  type="text"
                  value={clientInfo.advertiserName}
                  onChange={e => setClientInfo({ ...clientInfo, advertiserName: e.target.value })}
                  placeholder="예: (주)OO전자"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품명*</label>
                <input
                  type="text"
                  value={clientInfo.productName}
                  onChange={e => setClientInfo({ ...clientInfo, productName: e.target.value })}
                  placeholder="예: 로봇청소기 (URL 실패시 제품명으로 검색)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제품 URL (선택) <span className="text-xs text-slate-500 font-normal ml-1">- 제품 페이지가 있으면 좋습니다</span>
                </label>
                <input
                  type="url"
                  value={clientInfo.url}
                  onChange={e => setClientInfo({ ...clientInfo, url: e.target.value })}
                  placeholder="https://example.com/product"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
          </AccordionSection>

          {/* Section 2: AI Target Analysis */}
          <AccordionSection
            title="AI 타겟 분석"
            defaultOpen={true}
            disabled={!hasProductInfo}
            icon={<Sparkles size={18} />}
            className={hasProductInfo && !hasAIResult ? "ring-1 ring-slate-900 shadow-xl transition-all duration-500" : ""}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">추천 세그먼트 개수:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numRecommendations}
                  onChange={(e) => setNumRecommendations(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="font-bold text-blue-600 w-8">{numRecommendations}개</span>
              </div>

              <div className={hasProductInfo && !hasAIResult ? "animate-pulse" : ""}>
                <button
                  onClick={handleAIAnalysis}
                  disabled={aiLoading || !hasProductInfo}
                  className={`w-full py-4 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${hasProductInfo
                    ? "bg-slate-900 hover:bg-slate-800 shadow-sm"
                    : "bg-slate-200 cursor-not-allowed"
                    }`}
                >
                  {aiLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      KOBACO AI가 분석 중입니다...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> AI 타겟 분석 시작하기
                    </>
                  )}
                </button>
                {hasProductInfo && !hasAIResult && (
                  <p className="text-center text-slate-500 text-sm mt-3 font-medium">
                    위 버튼을 눌러 AI 분석을 시작하세요.
                  </p>
                )}
              </div>

              <AIRecommendation
                segments={aiResult?.segments || []}
                understanding={aiResult?.understanding || ''}
                keywords={aiResult?.keywords || []}
                isLoading={aiLoading}
              />
            </div>
          </AccordionSection>

          {/* Section 3: Conditions */}
          <AccordionSection
            title="타기팅 & 광고 조건 설정"
            defaultOpen={true}
            icon={<Settings size={18} />}
            className={hasAIResult ? "ring-1 ring-slate-900 shadow-xl transition-all duration-500 delay-300" : ""}
          >
            <p className="text-sm text-gray-500 mb-4">
              타깃이 명확할수록 광고 효율이 높아집니다.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Ad Duration */}
              <div className="p-5 border border-slate-200 rounded-lg bg-white">
                <label className="block text-sm font-semibold text-slate-700 mb-3">광고 노출 시간 (초)</label>
                <div className="flex gap-3">
                  {[15, 30].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setFormData({ ...formData, ad_duration: sec as 15 | 30 })}
                      className={`flex-1 py-2.5 rounded border text-sm font-semibold transition-all ${formData.ad_duration === sec
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {sec}초
                    </button>
                  ))}
                </div>
              </div>

              {/* 집행 이력 질문 (기존 신규 광고주) */}
              {/* 집행 이력 질문 */}
              <div className="p-5 border border-slate-200 rounded-lg bg-white">
                <label className="block text-sm font-semibold text-slate-700 mb-3">어드레서블 광고 집행 이력</label>
                <div className="flex gap-3">
                  {[
                    { label: '없음 (신규)', value: true },
                    { label: '있음', value: false }
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setFormData({ ...formData, is_new_advertiser: opt.value })}
                      className={`flex-1 py-2.5 px-4 rounded border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${formData.is_new_advertiser === opt.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Targeting Options */}
              <div className="p-4 border rounded-xl md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-3">타기팅 설정</label>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.audience_targeting}
                      onChange={(e) => setFormData({ ...formData, audience_targeting: e.target.checked })}
                      className="w-5 h-5 text-slate-900 rounded focus:ring-slate-900"
                    />
                    <span className="font-medium text-gray-700">오디언스 타기팅</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-slate-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.region_targeting}
                      onChange={(e) => setFormData({ ...formData, region_targeting: e.target.checked })}
                      className="w-5 h-5 text-slate-900 rounded focus:ring-slate-900"
                    />
                    <span className="font-medium text-gray-700">지역 타기팅</span>
                  </label>
                </div>
                {!formData.audience_targeting && !formData.region_targeting && (
                  <p className="text-xs text-green-600 mt-3 font-medium">
                    ✅ 논타기팅(ROAS 최적화) 보너스가 적용됩니다.
                  </p>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* Section 4: Budget */}
          <AccordionSection
            title="예산 배분 계획"
            defaultOpen={true}
            icon={<Wallet size={18} />}
          >
            <p className="text-sm text-gray-500 mb-4">
              월 예산을 입력해주세요. 채널별 예상 노출량과 최종 단가를 자동 계산합니다.
            </p>

            <div className="space-y-6">
              {/* Total Budget Input & Two-way Distribution */}
              <div className="bg-gray-50 p-6 rounded-xl border">
                <div className="mb-8">
                  <label className="block text-xl font-bold text-gray-900 mb-2">총 월 예산 (단위: 만원)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={totalBudget || ''}
                    onChange={(e) => {
                      const total = parseFloat(e.target.value) || 0;
                      // Streamlit logic: MBC 30%, EBS 20%, PP 50%
                      const allocations = { 'MBC': 0.3, 'EBS': 0.2, 'PP': 0.5 };

                      const newBudgets: Record<string, number> = {
                        'MBC': Math.floor(total * allocations['MBC']),
                        'EBS': Math.floor(total * allocations['EBS']),
                        'PP': Math.floor(total * allocations['PP'])
                      };

                      // Fix rounding errors by adding remainder to PP
                      const loadedTotal = Object.values(newBudgets).reduce((a, b) => a + b, 0);
                      if (total > loadedTotal) {
                        newBudgets['PP'] += (total - loadedTotal);
                      }

                      setFormData(prev => ({
                        ...prev,
                        channel_budgets: newBudgets,
                        selected_channels: total > 0 ? ['MBC', 'EBS', 'PP'] : []
                      }));
                    }}
                    placeholder="예: 5000"
                    className="w-full px-4 py-4 text-right text-3xl font-black text-slate-900 border-b-2 border-slate-200 focus:border-slate-900 outline-none transition-colors bg-transparent placeholder:text-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    채널별 예산 세부 설정
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">* 개별 예산을 직접 수정할 수 있습니다.</span>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {['MBC', 'EBS', 'PP'].map(ch => (
                    <div key={ch} className="bg-white p-4 rounded-xl border-2 border-white shadow-sm hover:border-blue-200 transition-all">
                      <span className="block text-xs font-bold text-gray-400 mb-2">{ch}</span>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.channel_budgets[ch] || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const newBudgets = { ...formData.channel_budgets, [ch]: val };
                            setFormData(prev => ({
                              ...prev,
                              channel_budgets: newBudgets
                            }));
                          }}
                          className="w-full text-right font-black text-gray-900 pr-8 bg-transparent outline-none focus:text-blue-600"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-normal text-gray-400">만원</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="p-5 border border-slate-200 rounded-lg bg-white">
                <label className="block text-sm font-semibold text-slate-700 mb-3">📅 광고 집행 기간 (개월)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="flex-1 accent-slate-900"
                  />
                  <span className="font-bold text-slate-900 text-lg w-16 text-right tabular-nums">{formData.duration}개월</span>
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Section 5: Results */}
          <AccordionSection
            title="AI 전략 분석 결과"
            defaultOpen={true}
            icon={<BarChart3 size={18} />}
          >
            {result && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-center shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 font-medium">총 월 예산</p>
                    <p className="text-xl font-black text-slate-900">{result.summary.total_budget.toLocaleString()}원</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-center shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 font-medium">총 월 노출수</p>
                    <p className="text-xl font-black text-slate-900">{result.summary.total_impressions.toLocaleString()}회</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-center shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 font-medium">평균 CPV</p>
                    <p className="text-xl font-black text-slate-900">{result.summary.average_cpv.toFixed(1)}원</p>
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg text-center shadow-sm">
                    <p className="text-sm text-gray-500 mb-1 font-medium">광고 초수</p>
                    <p className="text-xl font-black text-slate-900">{result.summary.ad_duration}초</p>
                  </div>
                </div>

                {/* Detail Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">채널</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">예산(원)</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">기본 CPV</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">보너스율</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">노출수</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-700">최종 CPV</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.details.map((detail) => (
                        <tr key={detail.channel} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{detail.channel}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{detail.budget.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{detail.base_cpv.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{detail.total_bonus_rate.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{detail.guaranteed_impressions.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{detail.final_cpv.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold border-t border-slate-200">
                        <td className="px-4 py-3 text-slate-900">종합</td>
                        <td className="px-4 py-3 text-right text-slate-900">{result.summary.total_budget.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right text-blue-600">{result.summary.total_impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-slate-900">{result.summary.average_cpv.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Print Button */}
                <button
                  onClick={goToPrint}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Printer size={20} />
                  견적서 출력하기
                </button>

              </div>
            )}
          </AccordionSection>
        </div>

      </main>
      <Footer />
    </div>
  );
}
