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
    try {
      if (typeof window === 'undefined') return;

      const savedData = localStorage.getItem('kobaco_estimate_data');
      if (!savedData) {
        // Data missing: Stay on page to show empty state (don't alert/redirect immediately to avoid blocking)
        return;
      }
      setData(JSON.parse(savedData));
    } catch (e) {
      console.error("Failed to load estimate data:", e);
    }
  }, []);

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md w-full">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Printer size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">견적 데이터가 없습니다</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            저장된 견적 내용이 없거나 만료되었습니다.<br />
            견적 시뮬레이터에서 다시 견적을 생성해주세요.
          </p>
          <button
            onClick={() => router.push('/estimate')}
            className="w-full py-3.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all"
          >
            견적 다시 내기
          </button>
        </div>
      </div>
    );
  }

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
    // Log usage (Print)
    fetch('/api/log/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        advertiser: info.advertiserName,
        product: info.productName,
        budget: result.summary.total_budget,
        cpv: result.summary.average_cpv,
        type: 'print'
      })
    }).catch(err => console.error('Logging failed:', err));

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

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
          .print-container {
            width: 210mm;
            height: 297mm;
            padding: 10mm 15mm !important;
            margin: 0 auto;
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid;
            overflow: hidden;
          }
        }
      `}</style>

      {/* A4 Paper Page */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[20mm] print:p-[10mm] print-container flex flex-col">

        {/* Header with Logo */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-3">
          <h1 className="text-[18px] font-black text-slate-900">AI 광고 최적화 플랜 (Addressable TV)</h1>
          <Image
            src="/kobaco_logo.png"
            alt="KOBACO"
            width={90}
            height={28}
            className="object-contain"
          />
        </div>

        {/* Info Table */}
        <table className="w-full border-collapse mb-3 border-t border-gray-800">
          <tbody>
            <tr>
              <th className="bg-gray-50 border border-gray-200 px-2 py-1 text-left text-[10px] font-bold w-[80px]">광고주명</th>
              <td className="border border-gray-200 px-2 py-1 text-[10px]">{info.advertiserName || 'N/A'}</td>
              <th className="bg-gray-50 border border-gray-200 px-2 py-1 text-left text-[10px] font-bold w-[80px]">제품명</th>
              <td className="border border-gray-200 px-2 py-1 text-[10px]">{info.productName || 'N/A'}</td>
            </tr>
            <tr>
              <th className="bg-gray-50 border border-gray-200 px-2 py-1 text-left text-[10px] font-bold">총 월 예산</th>
              <td className="border border-gray-200 px-2 py-1 text-[10px]">{result.summary.total_budget.toLocaleString()}원</td>
              <th className="bg-gray-50 border border-gray-200 px-2 py-1 text-left text-[10px] font-bold">집행 기간</th>
              <td className="border border-gray-200 px-2 py-1 text-[10px]">{result.summary.duration_months}개월</td>
            </tr>
          </tbody>
        </table>

        {/* AI Strategy Summary */}
        {aiResult?.understanding && (
          <section className="bg-gray-50 border border-gray-200 p-2.5 rounded mb-3">
            <h2 className="text-slate-900 font-black text-[11px] border-b border-gray-200 pb-1 mb-1.5 mt-0 uppercase tracking-tight">
              AI 광고 전략 가이드
            </h2>
            <p className="text-[10px] text-gray-800 leading-normal whitespace-pre-wrap">
              {aiResult.understanding}
            </p>
          </section>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="bg-white border border-gray-200 p-1.5 rounded text-center shadow-sm">
            <h3 className="text-[9px] text-gray-500 mb-0.5 font-bold">총 월 예산</h3>
            <p className="text-xs font-black text-slate-900">{result.summary.total_budget.toLocaleString()}원</p>
          </div>
          <div className="bg-white border border-gray-200 p-1.5 rounded text-center shadow-sm">
            <h3 className="text-[9px] text-gray-500 mb-0.5 font-bold">총 월 노출수</h3>
            <p className="text-xs font-black text-slate-900">{result.summary.total_impressions.toLocaleString()}회</p>
          </div>
          <div className="bg-white border border-gray-200 p-1.5 rounded text-center shadow-sm">
            <h3 className="text-[9px] text-gray-500 mb-0.5 font-bold">평균 CPV</h3>
            <p className="text-xs font-black text-slate-900">{result.summary.average_cpv.toFixed(1)}원</p>
          </div>
        </div>

        {/* Channel Detail Table */}
        <h2 className="text-slate-900 font-black text-[10px] border-l-4 border-slate-900 pl-2 mb-1.5 mt-2">채널별 상세 내역 (월 기준)</h2>
        <table className="w-full text-[9px] border-collapse mb-3">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">채널</th>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">예산(원)</th>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">기본 CPV</th>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">보너스율</th>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">할증율</th>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">최종 CPV</th>
              <th className="border border-gray-200 px-1 py-1 text-center font-bold text-gray-700">보장 노출수</th>
            </tr>
          </thead>
          <tbody>
            {result.details.map((detail, i) => (
              <tr key={i}>
                <td className="border border-gray-200 px-1 py-0.5 text-center font-black">{detail.channel}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-right">{detail.budget.toLocaleString()}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-right">{detail.base_cpv.toFixed(1)}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-right">{detail.total_bonus_rate.toFixed(1)}%</td>
                <td className="border border-gray-200 px-1 py-0.5 text-right">{detail.total_surcharge_rate.toFixed(1)}%</td>
                <td className="border border-gray-200 px-1 py-0.5 text-right font-bold">{detail.final_cpv.toFixed(1)}</td>
                <td className="border border-gray-200 px-1 py-0.5 text-right font-black">{detail.guaranteed_impressions.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-black">
              <td className="border border-gray-200 px-1 py-0.5 text-center font-black">종합</td>
              <td className="border border-gray-200 px-1 py-0.5 text-right">{result.summary.total_budget.toLocaleString()}</td>
              <td className="border border-gray-200 px-1 py-0.5 text-right">{baseCpvTotal.toFixed(1)}</td>
              <td className="border border-gray-200 px-1 py-0.5 text-right">{totalBonusRatePercent.toFixed(1)}%</td>
              <td className="border border-gray-200 px-1 py-0.5 text-right">-</td>
              <td className="border border-gray-200 px-1 py-0.5 text-right">{result.summary.average_cpv.toFixed(1)}</td>
              <td className="border border-gray-200 px-1 py-0.5 text-right text-blue-700">{result.summary.total_impressions.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* AI Target Analysis Detail */}
        {aiResult && aiResult.segments.length > 0 && (
          <>
            <h2 className="text-slate-900 font-black text-[10px] border-l-4 border-slate-900 pl-2 mb-1.5 mt-2">AI 타겟 분석 상세</h2>
            <div className="bg-gray-50 border border-gray-200 p-2 rounded flex-1">
              {aiResult.segments.slice(0, 5).map((segment, idx) => (
                <div key={idx} className={`${idx < Math.min(aiResult.segments.length, 5) - 1 ? 'border-b border-dashed border-gray-300 pb-1.5 mb-1.5' : ''}`}>
                  <p className="text-[10px]">
                    <strong className="text-gray-900">{idx + 1}. {segment.full_path || segment.name}</strong>
                    {segment.confidence_score && (
                      <span className="ml-2 text-red-600 font-bold text-[9px]">
                        [적합도: {segment.confidence_score.toFixed(0)}점]
                      </span>
                    )}
                  </p>
                  <p className="text-[9px] text-gray-700 ml-3 mt-0.5">
                    <strong>🔑 매칭 요소:</strong> {segment.key_factors?.join(', ')}
                  </p>
                  <p className="text-[9px] text-gray-600 ml-3 mt-0.5 leading-tight">
                    <strong>💡 추천 이유:</strong> {segment.reason}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-200 text-center">
          <div className="mb-2 text-[10px] text-gray-700 leading-tight">
            <strong>[제안서 문의] KOBACO 전략마케팅국 크로스세일즈팀</strong><br />
            박태준 차장 (02-731-7297, tj1000@kobaco.co.kr) | 이효정 과장 (02-731-7296, hlee0405@kobaco.co.kr)
          </div>
          <p className="text-[9px] text-gray-400">© 2026 KOBACO. All rights reserved. 본 제안서는 AI 시뮬레이션 결과로 실제 집행 시 차이가 있을 수 있습니다.</p>
        </div>

      </div>

      {/* Printing Guide Footer (Hidden when printing) */}
      <div className="max-w-[210mm] mx-auto mt-8 text-center text-gray-400 text-sm pb-20 print:hidden">
        <p>인쇄 설정에서 <b>'배경 그래픽'</b>을 체크하시면 디자인이 더 깔끔하게 보입니다.</p>
      </div>
    </div>
  );
}