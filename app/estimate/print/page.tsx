"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, ArrowLeft, Mail } from 'lucide-react';

export default function EstimatePrint() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

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

  const { form, info, result } = data;
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
          PDF로 저장 / 인쇄
        </button>
      </div>

      {/* A4 Paper Page */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-2xl p-[20mm] print:shadow-none print:p-[15mm]">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-blue-900 pb-8 mb-10">
          <div>
            <h1 className="text-3xl font-black text-blue-900 mb-2">KOBACO Addressable TV</h1>
            <p className="text-gray-500 font-medium tracking-tight text-lg">광고 집행 예상 견적서</p>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>발행일: {today}</p>
            <p>견적번호: ATV-{Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Campaign Info */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
            캠페인 개요
          </h2>
          <div className="grid grid-cols-2 gap-y-4 border-t border-b border-gray-100 py-6">
            <div className="flex">
              <span className="w-24 text-gray-500 font-medium">광고주명</span>
              <span className="font-bold text-gray-900">{info.advertiserName}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-500 font-medium">제품/브랜드</span>
              <span className="font-bold text-gray-900">{info.productName}</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-500 font-medium">집행 기간</span>
              <span className="font-bold text-gray-900">{form.duration}개월</span>
            </div>
            <div className="flex">
              <span className="w-24 text-gray-500 font-medium">소재 길이</span>
              <span className="font-bold text-gray-900">{form.ad_duration}초</span>
            </div>
            <div className="flex col-span-2">
              <span className="w-24 text-gray-500 font-medium">적용 조건</span>
              <div className="flex gap-2">
                {form.is_new_advertiser && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100 font-bold">신규 광고주</span>}
                {form.audience_targeting && <span className="px-2 py-0.5 bg-slate-50 text-slate-700 text-xs rounded border border-slate-200">오디언스 타게팅</span>}
                {form.region_targeting && <span className="px-2 py-0.5 bg-slate-50 text-slate-700 text-xs rounded border border-slate-200">지역 타게팅</span>}
                {!form.audience_targeting && !form.region_targeting && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded border border-green-100">논타게팅 보너스</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Table */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
            채널별 집행 내역 (월 기준)
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-t-2 border-gray-900">
              <tr>
                <th className="py-3 px-4 text-left font-bold text-gray-700">매체명</th>
                <th className="py-3 px-4 text-right font-bold text-gray-700">집행 금액 (VAT 별도)</th>
                <th className="py-3 px-4 text-right font-bold text-gray-700">보장 완전시청수 (CPV)</th>
                <th className="py-3 px-4 text-right font-bold text-gray-700">최종 CPV 단가</th>
              </tr>
            </thead>
            <tbody className="divide-y border-b border-gray-200">
              {result.details.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-4 px-4 font-bold text-gray-900">{item.channel}</td>
                  <td className="py-4 px-4 text-right text-gray-900">{(item.budget / form.duration).toLocaleString()} 원</td>
                  <td className="py-4 px-4 text-right text-gray-900">{(item.guaranteed_impressions / form.duration).toLocaleString()} 회</td>
                  <td className="py-4 px-4 text-right text-blue-700 font-medium">{Math.round(item.final_cpv).toLocaleString()} 원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Total Summary */}
        <section className="mb-16 bg-blue-900 text-white p-8 rounded-xl flex justify-between items-center">
          <div>
            <p className="text-blue-200 text-sm mb-1 uppercase tracking-wider font-bold">Total Summary</p>
            <h3 className="text-xl font-medium">총 합계 ({form.duration}개월)</h3>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-end justify-end gap-4">
              <span className="text-blue-300 text-sm mb-1">총 예산</span>
              <span className="text-3xl font-black">{result.summary.total_budget.toLocaleString()} 원</span>
            </div>
            <div className="flex items-end justify-end gap-4">
              <span className="text-blue-300 text-sm mb-1">총 보장 노출</span>
              <span className="text-3xl font-black">{result.summary.total_impressions.toLocaleString()} 회</span>
            </div>
            <p className="text-blue-200 text-xs">※ 평균 CPV: {Math.round(result.summary.average_cpv).toLocaleString()} 원 (VAT 별도)</p>
          </div>
        </section>

        {/* Disclaimer & Footer */}
        <section className="space-y-6 text-xs text-gray-500 leading-relaxed border-t pt-8">
          <div>
            <h4 className="font-bold text-gray-700 mb-2">안내사항 및 면책 공고</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>본 견적서는 예상 시뮬레이션 결과이며, 실제 청약 시 매체 인벤토리 상황에 따라 변동될 수 있습니다.</li>
              <li>모든 금액은 부가세(VAT) 별도 금액입니다.</li>
              <li>Addressable TV 광고는 시청자가 광고를 끝까지 시청(완전시청)했을 때만 과금됩니다.</li>
              <li>신규 광고주 보너스 및 기간/볼륨 보너스는 내부 운영 정책에 따라 조정될 수 있습니다.</li>
            </ul>
          </div>

          <div className="flex justify-between items-end pt-10">
            <div className="space-y-1">
              <p className="font-bold text-gray-800 text-sm">문의처: KOBACO 미디어본부</p>
              <p className="flex items-center gap-1"><Mail size={12} /> media_atv@kobaco.co.kr</p>
            </div>
            <div className="text-right italic font-serif text-gray-300 text-4xl select-none">
              KOBACO
            </div>
          </div>
        </section>

      </div>

      {/* Printing Guide Footer (Hidden when printing) */}
      <div className="max-w-[210mm] mx-auto mt-8 text-center text-gray-400 text-sm pb-20 print:hidden">
        <p>인쇄 설정에서 <b>'배경 그래픽'</b>을 체크하시면 디자인이 더 깔끔하게 보입니다.</p>
      </div>
    </div>
  );
}
