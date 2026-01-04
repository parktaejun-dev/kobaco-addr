"use client";

import { useState, useEffect } from 'react';
import { calculateEstimate, EstimateRequest, EstimateResult } from '@/lib/calculator';
import { Segment } from '@/lib/ai-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AccordionSection } from '@/components/Accordion';
import { AIRecommendation } from '@/components/AIRecommendation';
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
    is_new_advertiser: false,
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
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const goToPrint = () => {
    localStorage.setItem('kobaco_estimate_data', JSON.stringify({
      form: formData,
      info: clientInfo,
      result,
      aiResult
    }));
    router.push('/estimate/print');
  };

  const totalBudget = Object.values(formData.channel_budgets).reduce((a, b) => a + b, 0);
  const hasProductInfo = clientInfo.productName.trim().length > 0;
  const hasAIResult = !!(aiResult && aiResult.segments.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-blue-900">KOBACO Addressable</Link>
          <div className="flex items-center gap-4">
            <a
              href="https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7"
              target="_blank"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              🤖 AI에게 질문하기 <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="mb-8 text-center space-y-4">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">KOBATA AI 견적 시뮬레이터</h1>
          <p className="text-lg text-gray-500">
            Addressable TV 광고 캠페인 견적을 AI가 최적화해 드립니다.
          </p>
        </div>

        {/* Quick Links Banner */}
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <a
            href="https://notebooklm.google.com/notebook/ab573898-2bb6-4034-8694-bc1c08d480c7"
            target="_blank"
            className="flex items-center justify-center gap-2 p-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all text-sm"
          >
            🤖 AI에게 질문하기
            <ExternalLink size={14} className="opacity-70" />
          </a>
          <a
            href="https://drive.google.com/file/d/1iyZCKQSYvrxazfxaz4F5Eh2ejjfWbZUw/view?usp=sharing"
            target="_blank"
            className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all text-sm"
          >
            📄 소개자료 다운로드
            <ExternalLink size={14} className="text-gray-400" />
          </a>
          <a
            href="mailto:tj1000@kobaco.co.kr"
            className="flex items-center justify-center gap-2 p-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all text-sm"
          >
            📧 담당자 문의
            <span className="text-xs font-normal text-gray-400">| 박태준 차장</span>
          </a>
        </div>

        <div className="space-y-6">
          {/* Section 1: Basic Info */}
          <AccordionSection
            title="1️⃣ 광고 캠페인 기본 정보"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품명*</label>
                <input
                  type="text"
                  value={clientInfo.productName}
                  onChange={e => setClientInfo({ ...clientInfo, productName: e.target.value })}
                  placeholder="예: 로봇청소기 (URL 실패시 제품명으로 검색)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제품 URL (선택)</label>
                <input
                  type="url"
                  value={clientInfo.url}
                  onChange={e => setClientInfo({ ...clientInfo, url: e.target.value })}
                  placeholder="https://example.com/product"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </AccordionSection>

          {/* Section 2: AI Target Analysis */}
          <AccordionSection
            title="2️⃣ AI 타겟 분석"
            defaultOpen={true}
            disabled={!hasProductInfo}
            icon={<Sparkles size={18} />}
            className={hasProductInfo && !hasAIResult ? "ring-2 ring-blue-400 ring-offset-2 shadow-lg transition-all duration-500" : ""}
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
                  className={`w-full py-4 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${hasProductInfo
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-md transform hover:-translate-y-1"
                    : "bg-gray-300 cursor-not-allowed"
                    }`}
                >
                  {aiLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      🤖 AI 타겟 분석 요청
                    </>
                  )}
                </button>
                {hasProductInfo && !hasAIResult && (
                  <p className="text-center text-blue-600 text-sm mt-2 font-medium animate-bounce">
                    👆 위 버튼을 눌러 AI 분석을 시작하세요!
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
            title="3️⃣ 타기팅 & 광고 조건 설정"
            defaultOpen={true}
            icon={<Settings size={18} />}
            className={hasAIResult ? "ring-2 ring-blue-400 ring-offset-2 shadow-lg transition-all duration-500 delay-300" : ""}
          >
            <p className="text-sm text-gray-500 mb-4">
              타깃이 명확할수록 광고 효율이 높아집니다.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Ad Duration */}
              <div className="p-4 border rounded-xl bg-white">
                <label className="block text-sm font-medium text-gray-500 mb-3">광고 초수</label>
                <div className="flex gap-3">
                  {[15, 30].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => setFormData({ ...formData, ad_duration: sec as 15 | 30 })}
                      className={`flex-1 py-3 rounded-lg border font-medium transition-all ${formData.ad_duration === sec
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      {sec}초
                    </button>
                  ))}
                </div>
              </div>

              {/* New Advertiser */}
              <div className="p-4 border rounded-xl">
                <label className="block text-sm font-medium text-gray-500 mb-3">신규 광고주</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">KOBACO ATV 첫 집행?</span>
                  <button
                    onClick={() => setFormData({ ...formData, is_new_advertiser: !formData.is_new_advertiser })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_new_advertiser ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${formData.is_new_advertiser ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                  </button>
                </div>
                {formData.is_new_advertiser && (
                  <p className="text-xs text-blue-600 mt-2 font-medium">✨ 신규 광고주 프로모션 적용!</p>
                )}
              </div>

              {/* Targeting Options */}
              <div className="p-4 border rounded-xl md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-3">타게팅 설정</label>
                <div className="grid md:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.audience_targeting}
                      onChange={(e) => setFormData({ ...formData, audience_targeting: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-medium text-gray-700">오디언스 타게팅</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.region_targeting}
                      onChange={(e) => setFormData({ ...formData, region_targeting: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <span className="font-medium text-gray-700">지역 타게팅</span>
                  </label>
                </div>
                {!formData.audience_targeting && !formData.region_targeting && (
                  <p className="text-xs text-green-600 mt-3 font-medium">
                    ✅ 논타겟팅(ROAS 최적화) 보너스가 적용됩니다.
                  </p>
                )}
              </div>
            </div>
          </AccordionSection>

          {/* Section 4: Budget */}
          <AccordionSection
            title="4️⃣ 예산 배분 계획"
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
                  <label className="block text-sm font-bold text-gray-700 mb-2">💰 총 월 예산 (단위: 만원)</label>
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
                    className="w-full px-4 py-4 text-right text-2xl font-black text-blue-600 border-2 border-blue-100 rounded-2x focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none shadow-sm transition-all"
                  />
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <ArrowUpRight size={16} className="text-blue-500" /> 채널별 예산 세부 설정
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
              <div className="p-4 border rounded-xl">
                <label className="block text-sm font-medium text-gray-500 mb-2">📅 광고 기간 (개월)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="font-bold text-blue-600 text-lg w-16 text-right">{formData.duration}개월</span>
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Section 5: Results */}
          <AccordionSection
            title="5️⃣ AI 전략 분석 결과"
            defaultOpen={true}
            icon={<BarChart3 size={18} />}
          >
            {result && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <p className="text-sm text-blue-600 mb-1">총 월 예산</p>
                    <p className="text-xl font-bold text-blue-900">{result.summary.total_budget.toLocaleString()}원</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <p className="text-sm text-blue-600 mb-1">총 월 노출수</p>
                    <p className="text-xl font-bold text-blue-900">{result.summary.total_impressions.toLocaleString()}회</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <p className="text-sm text-blue-600 mb-1">평균 CPV</p>
                    <p className="text-xl font-bold text-blue-900">{result.summary.average_cpv.toFixed(1)}원</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl text-center">
                    <p className="text-sm text-blue-600 mb-1">광고 초수</p>
                    <p className="text-xl font-bold text-blue-900">{result.summary.ad_duration}초</p>
                  </div>
                </div>

                {/* Detail Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-4 py-3 text-left font-semibold">채널</th>
                        <th className="px-4 py-3 text-right font-semibold">예산(원)</th>
                        <th className="px-4 py-3 text-right font-semibold">기본 CPV</th>
                        <th className="px-4 py-3 text-right font-semibold">보너스율</th>
                        <th className="px-4 py-3 text-right font-semibold">노출수</th>
                        <th className="px-4 py-3 text-right font-semibold">최종 CPV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.details.map((detail) => (
                        <tr key={detail.channel} className="border-b">
                          <td className="px-4 py-3 font-medium">{detail.channel}</td>
                          <td className="px-4 py-3 text-right">{detail.budget.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{detail.base_cpv.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{detail.total_bonus_rate.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right font-semibold">{detail.guaranteed_impressions.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">{detail.final_cpv.toFixed(1)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-bold">
                        <td className="px-4 py-3">종합</td>
                        <td className="px-4 py-3 text-right">{result.summary.total_budget.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right">-</td>
                        <td className="px-4 py-3 text-right text-blue-600">{result.summary.total_impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{result.summary.average_cpv.toFixed(1)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Print Button */}
                <button
                  onClick={goToPrint}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  📄 AI 광고 전략 제안서 생성하기
                </button>

                <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-600 flex gap-2">
                  <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <span>위 결과는 시뮬레이션이며, 실제 집행 시 인벤토리 상황에 따라 달라질 수 있습니다.</span>
                </div>
              </div>
            )}
          </AccordionSection>
        </div>

      </main>
    </div>
  );
}
