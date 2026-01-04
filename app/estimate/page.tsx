"use client";

import { useState, useEffect } from 'react';
import { calculateEstimate, EstimateRequest, EstimateResult } from '@/lib/calculator';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Check, AlertCircle } from 'lucide-react';

export default function EstimateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<EstimateResult | null>(null);

  const [formData, setFormData] = useState<EstimateRequest>({
    selected_channels: ['MBC', 'EBS', 'KBS', 'TVCHOSUN'], // Default selection
    channel_budgets: { 'MBC': 0, 'EBS': 0, 'KBS': 0, 'TVCHOSUN': 0 },
    duration: 1,
    region_targeting: false,
    region_selections: {},
    audience_targeting: false,
    ad_duration: 15,
    custom_targeting: false,
    is_new_advertiser: false,
  });

  // Client info (not used in calc but needed for print)
  const [clientInfo, setClientInfo] = useState({
    advertiserName: '',
    productName: '',
    url: ''
  });

  useEffect(() => {
    // Auto-calculate when inputs change
    if (step >= 3) {
      const res = calculateEstimate(formData);
      setResult(res);
    }
  }, [formData, step]);

  const handleBudgetChange = (channel: string, value: string) => {
    const numVal = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      channel_budgets: {
        ...prev.channel_budgets,
        [channel]: numVal
      },
      // Auto-add channel to selected if budget > 0
      selected_channels: numVal > 0 
        ? Array.from(new Set([...prev.selected_channels, channel]))
        : prev.selected_channels
    }));
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const goToPrint = () => {
    // Save state to localStorage or pass via query params?
    // LocalStorage is safer for larger data
    localStorage.setItem('kobaco_estimate_data', JSON.stringify({ form: formData, info: clientInfo, result }));
    router.push('/estimate/print');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-blue-900">KOBACO A.TV</Link>
          <div className="flex items-center space-x-2 text-sm font-medium text-gray-500">
            <span className={step >= 1 ? "text-blue-600" : ""}>기본정보</span>
            <ChevronRight size={14} />
            <span className={step >= 2 ? "text-blue-600" : ""}>조건설정</span>
            <ChevronRight size={14} />
            <span className={step >= 3 ? "text-blue-600" : ""}>예산/결과</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 min-h-[600px] flex flex-col relative">
          
          {/* Step 1: Client Info */}
          {step === 1 && (
            <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-900">어떤 광고를 준비 중이신가요?</h2>
              
              <div className="space-y-6 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">광고주명</label>
                  <input 
                    type="text" 
                    value={clientInfo.advertiserName}
                    onChange={e => setClientInfo({...clientInfo, advertiserName: e.target.value})}
                    placeholder="예: 삼성전자"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">제품명/브랜드명</label>
                  <input 
                    type="text" 
                    value={clientInfo.productName}
                    onChange={e => setClientInfo({...clientInfo, productName: e.target.value})}
                    placeholder="예: 갤럭시 S24"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">랜딩 페이지 URL (선택)</label>
                  <input 
                    type="url" 
                    value={clientInfo.url}
                    onChange={e => setClientInfo({...clientInfo, url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Conditions */}
          {step === 2 && (
            <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl font-bold text-gray-900">캠페인 조건을 설정해주세요.</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Ad Duration */}
                <div className="p-6 border rounded-xl hover:border-blue-300 transition-colors">
                  <span className="block text-sm font-medium text-gray-500 mb-4">광고 소재 길이</span>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setFormData({...formData, ad_duration: 15})}
                      className={`flex-1 py-3 rounded-lg border font-medium transition-all ${formData.ad_duration === 15 ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      15초
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, ad_duration: 30})}
                      className={`flex-1 py-3 rounded-lg border font-medium transition-all ${formData.ad_duration === 30 ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      30초
                    </button>
                  </div>
                </div>

                {/* New Advertiser */}
                <div className="p-6 border rounded-xl hover:border-blue-300 transition-colors">
                  <span className="block text-sm font-medium text-gray-500 mb-4">신규 광고주 여부</span>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">KOBACO Addressable TV 첫 집행인가요?</span>
                    <button 
                      onClick={() => setFormData({...formData, is_new_advertiser: !formData.is_new_advertiser})}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_new_advertiser ? 'bg-blue-600' : 'bg-gray-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${formData.is_new_advertiser ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  {formData.is_new_advertiser && <p className="text-xs text-blue-600 mt-2 font-medium">✨ 신규 광고주 프로모션 혜택이 적용됩니다!</p>}
                </div>

                {/* Targeting */}
                <div className="p-6 border rounded-xl hover:border-blue-300 transition-colors md:col-span-2">
                  <span className="block text-sm font-medium text-gray-500 mb-4">타게팅 설정</span>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={formData.audience_targeting}
                        onChange={(e) => setFormData({...formData, audience_targeting: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        id="audience"
                      />
                      <label htmlFor="audience" className="text-gray-700 font-medium cursor-pointer">오디언스 타게팅</label>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input 
                        type="checkbox" 
                        checked={formData.region_targeting}
                        onChange={(e) => setFormData({...formData, region_targeting: e.target.checked})}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        id="region"
                      />
                      <label htmlFor="region" className="text-gray-700 font-medium cursor-pointer">지역 타게팅</label>
                    </div>
                  </div>
                  {!formData.audience_targeting && !formData.region_targeting && (
                    <p className="text-xs text-green-600 mt-3 font-medium flex items-center gap-1">
                      <Check size={12} /> 논타게팅(ROAS 최적화) 보너스가 적용됩니다.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Budget & Result */}
          {step === 3 && (
            <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row gap-8 h-full">
                {/* Left: Input */}
                <div className="w-full md:w-1/2 space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">예산 설정 (단위: 만원)</h2>
                  
                  <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                    {['MBC', 'EBS', 'KBS', 'TVCHOSUN'].map(ch => (
                      <div key={ch} className="flex items-center justify-between">
                        <label className="font-semibold text-gray-700 w-24">{ch}</label>
                        <input 
                          type="number"
                          min="0"
                          step="100"
                          value={formData.channel_budgets[ch] || ''}
                          onChange={(e) => handleBudgetChange(ch, e.target.value)}
                          placeholder="0"
                          className="w-32 px-3 py-2 text-right border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-sm text-gray-500 ml-2">만원</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 border rounded-xl">
                    <label className="block text-sm font-medium text-gray-500 mb-2">집행 기간 (개월)</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="range" 
                        min="1" 
                        max="12" 
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="font-bold text-blue-600 text-lg w-12 text-right">{formData.duration}개월</span>
                    </div>
                  </div>
                </div>

                {/* Right: Summary */}
                <div className="w-full md:w-1/2 bg-blue-50 rounded-xl p-6 border border-blue-100 flex flex-col justify-center">
                  <h3 className="font-bold text-blue-900 mb-6 text-lg">예상 집행 결과</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <span className="block text-sm text-blue-600 mb-1">총 예산</span>
                      <span className="text-3xl font-extrabold text-blue-900">
                        {result?.summary.total_budget.toLocaleString()} <span className="text-lg font-medium">원</span>
                      </span>
                    </div>

                    <div>
                      <span className="block text-sm text-blue-600 mb-1">총 보장 완전시청수 (CPV)</span>
                      <span className="text-3xl font-extrabold text-blue-900">
                        {result?.summary.total_impressions.toLocaleString()} <span className="text-lg font-medium">회</span>
                      </span>
                    </div>

                    <div className="pt-6 border-t border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-blue-800">예상 평균 CPV</span>
                        <span className="text-xl font-bold text-blue-900">
                          {Math.round(result?.summary.average_cpv || 0).toLocaleString()} 원
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 bg-white p-4 rounded-lg border border-blue-100 text-sm text-gray-600">
                    <p className="flex gap-2">
                      <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <span>위 결과는 시뮬레이션이며, 실제 집행 시 인벤토리 상황에 따라 달라질 수 있습니다.</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="mt-auto pt-8 flex justify-between border-t border-gray-100">
            {step > 1 ? (
              <button 
                onClick={prevStep}
                className="px-6 py-3 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                이전
              </button>
            ) : (
              <div /> // Spacer
            )}

            {step < 3 ? (
              <button 
                onClick={nextStep}
                disabled={step === 1 && !clientInfo.advertiserName} // Require advertiser name
                className="px-8 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 단계
              </button>
            ) : (
              <button 
                onClick={goToPrint}
                className="px-8 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-900/20 flex items-center gap-2"
              >
                <span>견적서 출력하기</span>
                <ChevronRight size={18} />
              </button>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
