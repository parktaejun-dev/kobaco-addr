
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { Check, ArrowRight, FileText, BarChart3, Target } from 'lucide-react';

// --- Data Loading Helpers ---
function getContent(type: string, id?: string) {
  const CONTENT_DIR = path.join(process.cwd(), 'content');
  try {
    const filePath = id 
      ? path.join(CONTENT_DIR, 'sections', `${id}.json`)
      : path.join(CONTENT_DIR, `${type}.json`);
    
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

// --- Section Components ---

function Hero({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section className="relative w-full h-[85vh] flex items-center justify-center bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-slate-900 to-black opacity-90 z-0" />
      <div className="relative z-10 max-w-5xl w-full text-center px-6 space-y-8">
        <div className="space-y-4">
          <span className="inline-block text-blue-400 font-bold tracking-[0.2em] uppercase text-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
            {data.eyebrow}
          </span>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none drop-shadow-md">
            {data.title}
          </h1>
        </div>
        <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
          {data.subtitle}
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          {data.kpis?.map((kpi: any, i: number) => (
            <span key={i} className="px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full text-sm font-medium border border-white/10 text-blue-100">
              {kpi.label}
            </span>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
          {data.ctas?.map((cta: any, i: number) => (
            <Link 
              key={i}
              href={cta.actionType === 'openEstimator' ? '/estimate' : '#'}
              className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full bg-blue-600 px-10 text-lg font-bold text-white shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all hover:scale-105"
            >
              {cta.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ValueProps({ data }: { data: any }) {
  if (!data) return null;
  const icons = [<Target key="1" className="text-blue-600" />, <BarChart3 key="2" className="text-blue-600" />, <FileText key="3" className="text-blue-600" />];
  return (
    <section id="valueProps" className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-slate-900 mb-16">{data.title}</h2>
        <div className="grid md:grid-cols-3 gap-8 text-left">
          {data.cards?.map((card: any, i: number) => (
            <div key={i} className="p-10 rounded-3xl bg-slate-50 border border-slate-100 hover:shadow-2xl transition-all group">
              <div className="w-14 h-14 bg-white rounded-2xl mb-8 flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                {icons[i % 3]}
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{card.title}</h3>
              <p className="text-slate-600 leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Reporting({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section id="reporting" className="py-24 px-6 bg-slate-50 border-y border-slate-200">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-6 text-left">
          <h2 className="text-4xl font-bold text-slate-900 leading-tight">{data.title}</h2>
          <p className="text-xl text-slate-600 leading-relaxed">{data.description}</p>
          <div className="pt-4 flex gap-4">
             <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Check size={20} /> 실시간 대시보드
             </div>
             <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Check size={20} /> 채널별 상세 성과
             </div>
          </div>
        </div>
        <div className="flex-1 w-full aspect-video bg-white rounded-3xl shadow-2xl border border-slate-200 flex items-center justify-center overflow-hidden">
            <div className="bg-slate-100 w-full h-full flex flex-col items-center justify-center text-slate-400 italic">
                <BarChart3 size={64} className="mb-4 opacity-20" />
                [ 리포팅 샘플 이미지 영역 ]
            </div>
        </div>
      </div>
    </section>
  );
}

function EstimateGuide({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section id="estimateGuide" className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-slate-900 mb-12">{data.title}</h2>
        <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-blue-100 -translate-y-1/2 z-0" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8">
                {data.steps?.map((step: string, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-4 group">
                        <div className="w-12 h-12 bg-white border-4 border-blue-600 text-blue-600 font-black rounded-full flex items-center justify-center text-xl shadow-lg group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            {i + 1}
                        </div>
                        <span className="font-bold text-slate-800">{step}</span>
                    </div>
                ))}
            </div>
        </div>
        <div className="mt-20">
            <Link 
                href="/estimate"
                className="inline-flex items-center gap-2 text-2xl font-black text-blue-600 hover:text-blue-800 transition-colors"
            >
                지금 견적 시작하기 <ArrowRight size={28} />
            </Link>
        </div>
      </div>
    </section>
  );
}

// --- Main Page Component ---

export default function Home() {
  const homeConfig = getContent('home');
  const sections = homeConfig?.sections || [];

  return (
    <main className="min-h-screen bg-white">
      {sections.map((section: any) => {
        if (!section.enabled) return null;
        const sectionData = getContent('section', section.id);
        
        switch (section.id) {
          case 'hero': return <Hero key={section.id} data={sectionData} />;
          case 'valueProps': return <ValueProps key={section.id} data={sectionData} />;
          case 'reporting': return <Reporting key={section.id} data={sectionData} />;
          case 'estimateGuide': return <EstimateGuide key={section.id} data={sectionData} />;
          default: return null;
        }
      })}
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-100 bg-slate-50 text-center text-slate-400 text-sm">
          <p>© 2026 KOBACO. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
              <Link href="/admin" className="hover:text-slate-600 underline underline-offset-4 font-medium">관리자(콘텐츠 편집)</Link>
              <Link href="/admin/usage" className="hover:text-slate-600 underline underline-offset-4 font-medium">사용 통계</Link>
          </div>
      </footer>
    </main>
  );
}
