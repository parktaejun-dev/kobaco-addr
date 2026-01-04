
import { getJSON } from '@/lib/kv-store';
import Link from 'next/link';
import { Check, ArrowRight, FileText, BarChart3, Target } from 'lucide-react';
import ConceptSection from '@/components/sections/ConceptSection';
import ComparisonSection from '@/components/sections/ComparisonSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import WhySection from '@/components/sections/WhySection';
import UseCasesSection from '@/components/sections/UseCasesSection';

// --- Data Loading Helpers ---
async function getContent(type: string, id?: string) {
  try {
    if (type === 'home') {
      return await getJSON('content', 'home');
    } else if (type === 'section' && id) {
      return await getJSON('content', id);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// --- Section Components ---

function Hero({ data }: { data: any }) {
  if (!data) return null;
  return (
    <section className="relative w-full min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/60 overflow-hidden">
      <div className="section-wrap section-pad">
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            {data.eyebrow && (
              <span className="inline-block text-blue-700 font-bold tracking-wider uppercase text-sm">
                {data.eyebrow}
              </span>
            )}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
              {data.title}
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            {data.subtitle}
          </p>
          {data.kpis?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              {data.kpis.map((kpi: any, i: number) => (
                <span key={i} className="px-4 py-2 bg-white rounded-full text-sm font-medium border border-slate-200 text-slate-700 shadow-sm">
                  {kpi.label}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            {data.ctas?.map((cta: any, i: number) => (
              <Link
                key={i}
                href={cta.actionType === 'openEstimator' ? '/estimate' : '#'}
                className="w-full sm:w-auto btn-primary h-14 px-10 text-lg"
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
    <section id="valueProps" className="section-pad bg-white">
      <div className="section-wrap">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-center mb-12">
          {data.title}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.cards?.map((card: any, i: number) => (
            <div key={i} className="card card-hover p-8 group">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {icons[i % 3]}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{card.title}</h3>
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
    <section id="estimateGuide" className="section-pad bg-white">
      <div className="section-wrap">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-12">
            {data.title}
          </h2>
          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-blue-100 -translate-y-1/2 z-0" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6">
              {data.steps?.map((step: string, i: number) => (
                <div key={i} className="flex flex-col items-center gap-4 group">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-600 bg-white text-xl font-extrabold text-blue-600 shadow-sm transition-all group-hover:bg-blue-600 group-hover:text-white">
                    {i + 1}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{step}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-16">
            <Link
              href="/estimate"
              className="btn-primary inline-flex items-center gap-2 text-lg"
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
  const homeConfig = await getContent('home');
  const sections = homeConfig?.sections || [];

  // Parallel data fetching for better performance
  const sectionsDataPromises = sections.map(async (section: any) => {
    if (!section.enabled) return null;
    const data = await getContent('section', section.id);
    return { ...section, data };
  });

  const resolvedSections = await Promise.all(sectionsDataPromises);

  return (
    <main className="min-h-screen bg-white">
      {resolvedSections.map((section: any) => {
        if (!section) return null;

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
