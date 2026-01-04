import { client } from '@/lib/sanity';
import Link from 'next/link';

// Fallback Data (MASTER SPEC Default)
const FALLBACK_HERO = {
  eyebrow: "KOBACO",
  title: "KOBACO Addressable TV",
  subtitle: "원하는 타겟에게만, 완전시청(CPV) 과금으로 합리적인 TV 광고를 시작하세요.",
  badges: ["타겟팅 광고", "CPV 과금", "상세 리포트"],
  cta: { label: "견적 산출하기", link: "/estimate" }
};

export default async function Home() {
  let hero = FALLBACK_HERO;
  
  // Try fetching from Sanity, fallback silently if fails (e.g. no project ID)
  try {
      if (client.config().projectId !== 'dummy-project-id') {
          const data = await client.fetch(`*[_type == "homePage"][0].hero`);
          if (data) hero = { ...FALLBACK_HERO, ...data };
      }
  } catch (e) {
      // console.warn("Sanity fetch failed:", e);
  }

  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero Section - Fixed Position & Editable */}
      <section className="relative w-full h-[85vh] flex items-center justify-center bg-slate-900 text-white overflow-hidden">
        {/* Background Overlay (Placeholder for Video/Image) */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 opacity-90 z-0" />
        
        <div className="relative z-10 max-w-5xl w-full text-center px-6 space-y-8">
            <div className="space-y-4">
                <span className="inline-block text-blue-400 font-bold tracking-[0.2em] uppercase text-sm">
                    {hero.eyebrow}
                </span>
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none text-white drop-shadow-sm">
                    {hero.title}
                </h1>
            </div>
            
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light">
                {hero.subtitle}
            </p>
            
            {/* KPI Badges */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
                {hero.badges.map((badge: string, i: number) => (
                    <span key={i} className="px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full text-sm font-medium border border-white/10 text-blue-100">
                        {badge}
                    </span>
                ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10">
                <Link 
                    href="/estimate"
                    className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full bg-blue-600 px-10 text-lg font-bold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 transition-all hover:scale-105 active:scale-95"
                >
                    {hero.cta.label}
                </Link>
                <Link 
                    href="#features"
                    className="w-full sm:w-auto inline-flex h-14 items-center justify-center rounded-full bg-white/10 px-10 text-lg font-medium text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                    더 알아보기
                </Link>
            </div>
        </div>
      </section>

      {/* Placeholder for Sections (ValueProps, Product, etc.) */}
      <section id="features" className="py-24 px-6 bg-white">
          <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-12">Why KOBACO Addressable TV?</h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                  {[
                      { title: "정교한 타겟팅", desc: "IPTV 셋톱박스 데이터를 기반으로 원하는 오디언스만 골라 노출합니다." },
                      { title: "합리적인 CPV 과금", desc: "광고를 끝까지 시청했을 때만 비용이 부과되는 완전시청 과금 방식입니다." },
                      { title: "투명한 성과 리포트", desc: "채널별, 타겟별 상세 노출 및 시청 성과를 투명하게 제공합니다." }
                  ].map((item, i) => (
                      <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-xl transition-shadow text-left">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg mb-6 flex items-center justify-center text-blue-600 font-bold text-xl">
                              {i + 1}
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                          <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>
    </main>
  );
}