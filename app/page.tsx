"use client";
import { useEffect, useState } from 'react';
import { logVisit } from '@/lib/api';
import EstimationFlow from '@/components/EstimationFlow';
import Modal from '@/components/ui/Modal';
import { Target, TrendingDown, BarChart3, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    logVisit();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            <span className="font-bold text-xl tracking-tight">KOBA-TA <span className="text-blue-600">Target Advisor</span></span>
          </div>
          <div className="flex items-center gap-4">
             <Link href="/admin/login" className="text-sm font-medium text-gray-500 hover:text-gray-900">
              Admin
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition"
            >
              무료 견적 체험하기
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 bg-gray-50 overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              KOBACO Addressable TV
            </div>
            <h1 className="text-4xl lg:text-6xl font-extrabold text-gray-900 tracking-tight mb-6 leading-tight">
              TV 광고, 이제 디지털처럼 <br className="hidden md:block"/>
              <span className="text-blue-600">정교하게 타겟팅</span>하세요
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              빅데이터 기반으로 원하는 시청자에게만 광고를 송출하여<br/>
              비용은 획기적으로 줄이고, 광고 효과는 극대화합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-blue-700 hover:scale-105 transition shadow-lg shadow-blue-200"
              >
                AI 무료 견적 체험하기 <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#features" className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 border px-8 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition">
                서비스 더 알아보기
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 lg:py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">왜 KOBA-TA 인가요?</h2>
              <p className="text-gray-500">기존 TV 광고의 한계를 넘어선 3가지 핵심 혁신 기술</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="group p-8 rounded-2xl bg-gray-50 hover:bg-blue-50 transition border border-gray-100 hover:border-blue-100">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition text-blue-600">
                  <Target className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">초정밀 타겟팅</h3>
                <p className="text-gray-600 leading-relaxed">
                  불특정 다수가 아닌, 지역/성별/관심사 기반으로
                  우리 브랜드에 꼭 맞는 가구에만 선별적으로 광고를 노출합니다.
                </p>
              </div>

              <div className="group p-8 rounded-2xl bg-gray-50 hover:bg-green-50 transition border border-gray-100 hover:border-green-100">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition text-green-600">
                  <TrendingDown className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">합리적인 과금</h3>
                <p className="text-gray-600 leading-relaxed">
                  송출 횟수와 상관없이, 실제 타겟 가구에
                  <span className="font-semibold text-green-700"> 완전 노출(Impression)</span>된 횟수만큼만
                  비용을 지불하세요.
                </p>
              </div>

              <div className="group p-8 rounded-2xl bg-gray-50 hover:bg-purple-50 transition border border-gray-100 hover:border-purple-100">
                <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition text-purple-600">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">정확한 성과 측정</h3>
                <p className="text-gray-600 leading-relaxed">
                  추정이 아닌 전수 데이터를 기반으로
                  디지털 광고 수준의 상세한 노출/도달 리포트를 제공해드립니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badge Section */}
        <section className="py-16 bg-blue-900 text-white">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2 text-blue-300 font-semibold">
                <ShieldCheck className="w-6 h-6" /> KOBACO 공인 서비스
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">대한민국 방송광고진흥공사가 보증합니다</h2>
              <p className="text-blue-200 mt-2">투명한 데이터와 공정한 집행 과정을 약속드립니다.</p>
            </div>
             <div className="flex flex-wrap gap-4 justify-center">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    <span>전수 데이터 분석</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    <span>프리미엄 채널 보장</span>
                </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-50 py-12 border-t">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div className="mb-4 md:mb-0">
                <span className="font-bold text-gray-900">KOBACO</span> &copy; {new Date().getFullYear()} All rights reserved.
            </div>
            <div className="flex gap-6">
                <a href="#" className="hover:text-gray-900">이용약관</a>
                <a href="#" className="hover:text-gray-900">개인정보처리방침</a>
                <Link href="/admin/login" className="hover:text-gray-900">관리자 로그인</Link>
            </div>
        </div>
      </footer>

      {/* Estimation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <EstimationFlow onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
