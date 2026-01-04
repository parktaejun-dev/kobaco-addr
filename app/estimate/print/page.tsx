"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Mail } from 'lucide-react';
import Image from 'next/image';
import { Segment } from '@/lib/ai-client';

interface PrintData {
  form: any;
  info: {
    advertiserName: string;
    productName: string;
    url: string;
  };
  result: {
    details: Array<{
      channel: string;
      budget: number;
      base_cpv: number;
      total_bonus_rate: number;
      total_surcharge_rate: number;
      guaranteed_impressions: number;
      final_cpv: number;
    }>;
    summary: {
      total_budget: number;
      total_impressions: number;
      average_cpv: number;
      ad_duration: number;
      duration_months: number;
    };
  };
  aiResult?: {
    segments: Segment[];
    understanding: string;
    keywords: string[];
  };
}

export default function EstimatePrint() {
  const router = useRouter();
  const [data, setData] = useState<PrintData | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('kobaco_estimate_data');
    if (!savedData) {
      alert("견적 데이터가 없습니다.");
      router.push('/estimate');
      return;
    }
    setData(JSON.parse(savedData));
  }, [router]);

  if (!data) return <div className="p-10 text-center">Loading...</div>;

  const { form, info, result, aiResult } = data;
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate summary stats
  const baseCpvTotal = 10.0;
  const totalBaseImpressions = result.summary.total_budget / baseCpvTotal;
  const totalBonusRatePercent = totalBaseImpressions > 0
    ? ((result.summary.total_impressions / totalBaseImpressions) - 1) * 100
    : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 print:bg-white print:py-0">
      {/* Action Bar (Hidden when printing) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center px-4 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={18} />
          수정하기
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-all"
        >
          <Printer size={18} />
          🖨️ 인쇄 / PDF로 저장
        </button>
      </div>

      {/* A4 Paper Page */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[20mm] print:shadow-none print:p-[15mm]">

        {/* Header with Logo */}
        <div className="flex justify-between items-center border-b-[3px] border-[#004a9e] pb-4 mb-6">
          <h1 className="text-[28px] font-black text-[#004a9e]">AI 광고 최적화 플랜</h1>
          <Image
            src="/kobaco_logo.png"
            alt="KOBACO"
            width={120}
            height={40}
            className="object-contain"
          />
        </div>

        {/* Info Table */}
        <table className="w-full border-collapse mb-6 border-t-2 border-gray-800">
          <tbody>
            <tr>
              <th className="bg-gray-100 border border-gray-300 px-3 py-3 text-left text-sm font-bold w-[120px]">광고주명</th>
              <td className="border border-gray-300 px-3 py-3 text-sm">{info.advertiserName || 'N/A'}</td>
              <th className="bg-gray-100 border border-gray-300 px-3 py-3 text-left text-sm font-bold w-[120px]">제품명</th>
              <td className="border border-gray-300 px-3 py-3 text-sm">{info.productName || 'N/A'}</td>
            </tr>
            <tr>
              <th className="bg-gray-100 border border-gray-300 px-3 py-3 text-left text-sm font-bold">총 월 예산</th>
              <td className="border border-gray-300 px-3 py-3 text-sm">{result.summary.total_budget.toLocaleString()}원</td>
              <th className="bg-gray-100 border border-gray-300 px-3 py-3 text-left text-sm font-bold">집행 기간</th>
              <td className="border border-gray-300 px-3 py-3 text-sm">{result.summary.duration_months}개월</td>
            </tr>
            <tr>
              <th className="bg-gray-100 border border-gray-300 px-3 py-3 text-left text-sm font-bold">분석일</th>
              <td className="border border-gray-300 px-3 py-3 text-sm">{today}</td>
              <th className="bg-gray-100 border border-gray-300 px-3 py-3 text-left text-sm font-bold">광고 초수</th>
              <td className="border border-gray-300 px-3 py-3 text-sm">{result.summary.ad_duration}초</td>
            </tr>
          </tbody>
        </table>

        {/* AI Strategy Summary (if available) */}
        {aiResult?.understanding && (
          <section className="bg-[#f0f6ff] border border-[#cce0ff] p-5 rounded mb-6">
            <h2 className="text-[#004a9e] font-bold text-lg border-b-2 border-gray-200 pb-2 mb-3 mt-0">
              AI 광고 전략 총평
            </h2>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {aiResult.understanding}
            </p>
            {aiResult.keywords.length > 0 && (
              <p className="text-sm text-[#004a9e] mt-2">
                <strong>🔑 확장 키워드:</strong> {aiResult.keywords.join(', ')}
              </p>
            )}
          </section>
        )}

        {/* Summary Cards */}
        <h2 className="text-[#004a9e] font-bold text-lg border-b-2 border-gray-200 pb-2 mb-4 mt-6">
          📊 종합 성과 요약 (월 기준)
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-100 border border-gray-300 p-4 rounded text-center">
            <h3 className="text-sm text-gray-600 mb-2 font-bold">총 월 예산</h3>
            <p className="text-xl font-bold text-[#004a9e]">{result.summary.total_budget.toLocaleString()}원</p>
          </div>
          <div className="bg-gray-100 border border-gray-300 p-4 rounded text-center">
            <h3 className="text-sm text-gray-600 mb-2 font-bold">총 월 노출수</h3>
            <p className="text-xl font-bold text-[#004a9e]">{result.summary.total_impressions.toLocaleString()}회</p>
          </div>
          <div className="bg-gray-100 border border-gray-300 p-4 rounded text-center">
            <h3 className="text-sm text-gray-600 mb-2 font-bold">평균 CPV</h3>
            <p className="text-xl font-bold text-[#004a9e]">{result.summary.average_cpv.toFixed(1)}원</p>
          </div>
        </div>

        {/* Channel Detail Table */}
        <h2 className="text-[#004a9e] font-bold text-lg border-b-2 border-gray-200 pb-2 mb-4 mt-6">
          📈 채널별 상세 내역 (월 기준)
        </h2>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-[#f0f6ff]">
              <tr>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">채널</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">예산(원)</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">기본 CPV</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">보너스율</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">할증율</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">최종 CPV</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-bold">보장 노출수</th>
              </tr>
            </thead>
            <tbody>
              {result.details.map((detail, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.channel}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.budget.toLocaleString()}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.base_cpv.toFixed(1)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.total_bonus_rate.toFixed(1)}%</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.total_surcharge_rate.toFixed(1)}%</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.final_cpv.toFixed(1)}</td>
                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.guaranteed_impressions.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="border border-gray-300 px-3 py-2 text-center">종합</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{result.summary.total_budget.toLocaleString()}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{baseCpvTotal.toFixed(1)}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{totalBonusRatePercent.toFixed(1)}%</td>
                <td className="border border-gray-300 px-3 py-2 text-center">-</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{result.summary.average_cpv.toFixed(1)}</td>
                <td className="border border-gray-300 px-3 py-2 text-center">{result.summary.total_impressions.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* AI Target Analysis Detail (if available) */}
        {aiResult && aiResult.segments.length > 0 && (
          <>
            <h2 className="text-[#004a9e] font-bold text-lg border-b-2 border-gray-200 pb-2 mb-4 mt-6">
              🎯 AI 타겟 분석 상세
            </h2>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded">
              {aiResult.segments.map((segment, idx) => (
                <div key={segment.name} className={`${idx < aiResult.segments.length - 1 ? 'border-b border-dashed border-gray-300 pb-3 mb-3' : ''}`}>
                  <p className="text-sm">
                    <strong className="text-gray-900">{idx + 1}. {segment.full_path || segment.name}</strong>
                    {segment.confidence_score && (
                      <span className="ml-3 text-red-600 font-bold">
                        [ 🎯 적합도: {segment.confidence_score.toFixed(0)}점 ]
                      </span>
                    )}
                  </p>
                  {segment.key_factors && segment.key_factors.length > 0 && (
                    <p className="text-sm text-gray-700 ml-5 mt-1">
                      <strong>🔑 핵심 매칭 요소:</strong>{' '}
                      <span className="text-[#004a9e] font-bold">{segment.key_factors.join(', ')}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-700 ml-5 mt-1">
                    <strong>💡 추천 이유:</strong> {segment.reason || 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-gray-200 text-center text-xs text-gray-500">
          <div className="mb-4 text-sm text-gray-700">
            <strong>[제안서 문의] KOBACO 전략마케팅국 크로스세일즈팀</strong><br />
            박태준 차장 (02-731-7297, tj1000@kobaco.co.kr) | 이효정 과장 (02-731-7296, hlee0405@kobaco.co.kr)
          </div>
          <p>© KOBACO. 본 문서는 시뮬레이션 결과이며 실제 집행 시 변동될 수 있습니다.</p>
        </div>

      </div>

      {/* Printing Guide Footer (Hidden when printing) */}
      <div className="max-w-[210mm] mx-auto mt-8 text-center text-gray-400 text-sm pb-20 print:hidden">
        <p>인쇄 설정에서 <b>'배경 그래픽'</b>을 체크하시면 디자인이 더 깔끔하게 보입니다.</p>
      </div>
    </div>
  );
}
