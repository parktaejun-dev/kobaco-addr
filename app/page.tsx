import { getHome, getSection } from '@/lib/content/kv';
import Link from 'next/link';
import { Check, ArrowRight, FileText, BarChart3, Target } from 'lucide-react';
import ConceptSection from '@/components/sections/ConceptSection';
import ComparisonSection from '@/components/sections/ComparisonSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import WhySection from '@/components/sections/WhySection';
import UseCasesSection from '@/components/sections/UseCasesSection';
import Footer from '@/components/Footer';

// --- Section Components ---

function Hero({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      <div className="section-wrap section-pad">
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-10">
          <div className="space-y-6">
            {data.eyebrow && (
              <span className="inline-block text-blue-700 font-bold tracking-wider uppercase text-xs sm:text-sm bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2">
                {data.eyebrow}
              </span>
            )}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white text-balance">
              {data.title}
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
            {data.subtitle}
          </p>
          {data.stats?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              {data.stats.map((stat: any, i: number) => (
                <div key={i} className="px-6 py-2 bg-white rounded-2xl text-sm font-medium border border-slate-200 text-slate-700 shadow-sm flex flex-col items-center">
                  <span className="text-lg font-black text-slate-900 leading-none">{stat.value}</span>
                  <span className="text-xs text-slate-500 mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            {data.ctas?.map((cta: any, i: number) => (
              <Link
                key={i}
                href={cta.actionType === 'openEstimator' ? '/estimate' : cta.target || '#'}
                className={`w-full sm:w-auto h-14 px-10 text-lg ${cta.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}`}
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ValueProps({ data }: { data: any }) {
  if (!data) return null;
  const icons = [
    <Target key="1" className="h-6 w-6" />,
    <BarChart3 key="2" className="h-6 w-6" />,
    <FileText key="3" className="h-6 w-6" />
  ];
  return (
    <section id="valueProps" className="section-pad bg-slate-50">
      <div className="section-wrap">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            {data.title}
          </h2>
          <p className="text-lg text-slate-600">{data.description}</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {data.cards?.map((card: any, i: number) => (
            <div key={i} className="card card-hover p-8 group flex flex-col items-start bg-white shadow-md">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 mb-6 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                {icons[i % 3]}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
              <p className="text-slate-600 leading-relaxed text-sm">{card.description}</p>
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
    <section id="reporting" className="section-pad bg-slate-900 text-slate-100">
      <div className="section-wrap grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight text-balance">{data.title}</h2>
          <p className="text-xl text-slate-600 leading-relaxed text-balance">{data.description}</p>
          <div className="pt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-slate-700 font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-fit">
              <div className="bg-blue-100 text-blue-700 p-1 rounded-lg"><Check size={16} /></div>
              실시간 캠페인 대시보드 제공
            </div>
            <div className="flex items-center gap-3 text-slate-700 font-bold bg-white p-4 rounded-xl border border-slate-200 shadow-sm w-fit">
              <div className="bg-blue-100 text-blue-700 p-1 rounded-lg"><Check size={16} /></div>
              채널별/권역별 상세 성과 리포트
            </div>
          </div>
        </div>

        {/* Metric Cards instead of Image Placeholder */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950 text-white shadow-2xl border-0 p-6 rounded-2xl">
            <div className="text-sm font-bold text-slate-400 mb-2">Total Impressions</div>
            <div className="text-3xl font-black text-white">1,240,500</div>
            <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">▲ 12.5% vs last week</div>
          </div>
          <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
            <div className="text-sm font-bold text-slate-400 mb-2">Avg. CPV</div>
            <div className="text-3xl font-black text-white">12.5 KRW</div>
            <div className="text-xs text-blue-600 font-bold mt-2">Optimized</div>
          </div>
          <div className="col-span-2 bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-400 mb-1">Campaign Status</div>
              <div className="text-lg font-black text-white">Active / On Track</div>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center animate-pulse">
              <BarChart3 size={20} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EstimateGuide({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section id="estimateGuide" className="section-white section-pad border-y border-slate-100">
      <div className="section-wrap">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-16">
            {data.title}
          </h2>
          <div className="relative">
            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-slate-100 z-0" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-4 gap-8">
              {data.steps?.map((step: string, i: number) => (
                <div key={i} className="flex flex-col items-center gap-6 group">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-lg text-3xl font-black text-slate-300 transition-all group-hover:scale-110 group-hover:border-blue-200 group-hover:text-blue-600">
                    {i + 1}
                  </div>
                  <span className="text-lg font-bold text-slate-800 leading-snug max-w-[150px]">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-20">
            <Link
              href="/estimate"
              className="btn-primary inline-flex items-center gap-3 text-lg px-12 py-5"
            >
              지금 견적 시작하기 <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Main Page Component ---

export default async function Home() {
  // Use new KV service
  const homeConfig = await getHome();
  const sections = homeConfig?.sections || [];

  // Parallel data fetching
  const sectionsDataPromises = sections.map(async (section: any) => {
    if (!section.enabled) return null;
    const data = await getSection(section.id);
    return { ...section, data };
  });

  const resolvedSections = await Promise.all(sectionsDataPromises);

  return (
    <main className="min-h-screen bg-white relative">
      {/* Global Header / Logo */}
      <header className="absolute top-0 left-0 w-full z-50 p-6 md:p-10 pointer-events-none">
        <div className="section-wrap pointer-events-auto">
          <img
            src="https://n2wpsx55oxsmnkaa.public.blob.vercel-storage.com/webpage/logo_red.png"
            alt="KOBACO Addressable TV"
            className="h-8 md:h-10"
          />
        </div>
      </header>

      {resolvedSections.map((section: any) => {
        if (!section || !section.data) return null; // Check for data existence

        const { id, data } = section;

        switch (id) {
          case 'hero': return <Hero key={id} data={data} />;
          case 'valueProps': return <ValueProps key={id} data={data} />;
          case 'concept': return <ConceptSection key={id} data={data} />;
          case 'comparison': return <ComparisonSection key={id} data={data} />;
          case 'howItWorks': return <HowItWorksSection key={id} data={data} />;
          case 'useCases': return <UseCasesSection key={id} data={data} />;
          case 'why': return <WhySection key={id} data={data} />;
          case 'reporting': return <Reporting key={id} data={data} />;
          case 'estimateGuide': return <EstimateGuide key={id} data={data} />;
          default: return null;
        }
      })}
    </main>
  );
}
