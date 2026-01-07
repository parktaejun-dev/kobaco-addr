import { getHome, getSection } from '@/lib/content/kv';
import Link from 'next/link';
import { Check, ArrowRight, FileText, BarChart3, Target } from 'lucide-react';
import ConceptSection from '@/components/sections/ConceptSection';
import ComparisonSection from '@/components/sections/ComparisonSection';
import HowItWorksSection from '@/components/sections/HowItWorksSection';
import WhySection from '@/components/sections/WhySection';
import UseCasesSection from '@/components/sections/UseCasesSection';
import FAQSection from '@/components/sections/FAQSection';
import ImageCardsSection from '@/components/sections/ImageCardsSection';
import Footer from '@/components/Footer';

// --- Section Components ---

function Hero({ data }: { data: any }) {
  if (!data) return null;

  // Font size mappings
  const titleSizeClasses: Record<string, string> = {
    sm: 'text-3xl sm:text-4xl lg:text-5xl',
    md: 'text-4xl sm:text-5xl lg:text-6xl',
    lg: 'text-5xl sm:text-6xl lg:text-7xl',
    xl: 'text-6xl sm:text-7xl lg:text-8xl',
  };
  const subtitleSizeClasses: Record<string, string> = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  };

  // Font color mappings
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    slate: 'text-slate-300',
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
  };

  const titleSizeClass = titleSizeClasses[data.titleSize || 'lg'];
  const titleColorClass = colorClasses[data.titleColor || 'white'];
  const subtitleSizeClass = subtitleSizeClasses[data.subtitleSize || 'lg'];
  const subtitleColorClass = colorClasses[data.subtitleColor || 'slate'];

  // Eyebrow size mappings
  const eyebrowSizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };
  const eyebrowSizeClass = eyebrowSizeClasses[data.eyebrowSize || 'sm'];

  // Eyebrow background color mappings
  const eyebrowBgClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
    green: 'bg-green-500/10 text-green-300 border border-green-500/20',
    purple: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-300 border border-orange-500/20',
    red: 'bg-red-500/10 text-red-300 border border-red-500/20',
    slate: 'bg-slate-700/50 text-slate-300 border border-slate-600',
    none: 'text-blue-400 font-bold',
  };
  const eyebrowClass = eyebrowBgClasses[data.eyebrowBg || 'blue'];

  return (
    <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Background Glow Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-[800px] h-[400px] bg-slate-800/50 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="section-wrap section-pad relative z-10">
        <div className="max-w-5xl mx-auto text-center space-y-10">
          <div className="space-y-6">
            {data.eyebrow && (
              <div className="flex justify-center">
                <span className={`${eyebrowSizeClass} ${eyebrowClass} ${data.eyebrowBg !== 'none' ? 'px-4 py-1.5 rounded-full backdrop-blur-sm' : ''}`}>
                  {data.eyebrow}
                </span>
              </div>
            )}
            <h1 className={`${titleSizeClass} ${titleColorClass} font-extrabold tracking-tight leading-[1.1] text-balance`}>
              {data.title?.split('\n').map((line: string, i: number) => (
                <span key={i}>{line}{i < data.title.split('\n').length - 1 && <br />}</span>
              ))}
            </h1>
          </div>
          <p className={`${subtitleSizeClass} ${subtitleColorClass} max-w-2xl mx-auto leading-relaxed text-balance`}>
            {data.subtitle?.split('\n').map((line: string, i: number) => (
              <span key={i}>{line}{i < (data.subtitle?.split('\n').length || 1) - 1 && <br />}</span>
            ))}
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
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 mb-6 shadow-sm border border-slate-100">
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
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
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

  // Font size mappings
  const titleSizeClasses: Record<string, string> = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl',
  };
  const subtitleSizeClasses: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  // Font color mappings
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    slate: 'text-slate-900', // Title default
    slateSub: 'text-slate-600', // Subtitle default
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };

  const titleSizeClass = titleSizeClasses[data.titleSize || 'md'];
  const titleColorClass = data.titleColor === 'slate' ? 'text-slate-900' : colorClasses[data.titleColor || 'slate'];
  
  // Use subtitle styles for description as well
  const subtitleSizeClass = subtitleSizeClasses[data.subtitleSize || 'md'];
  const subtitleColorClass = data.subtitleColor === 'slate' ? 'text-slate-600' : (colorClasses[data.subtitleColor || 'slate'] || 'text-slate-600');

  const description = data.description || data.subtitle;

  return (
    <section
      id="estimateGuide"
      className="section-pad bg-white border-t border-slate-200"
    >
      <div className="section-wrap max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center md:text-left">
          {data.eyebrow && (
            <span className="block text-blue-600 font-bold tracking-wide text-sm mb-3">
              {data.eyebrow}
            </span>
          )}
          <h2 className={`${titleSizeClass} ${titleColorClass} font-semibold tracking-tight`}>
            {data.title}
          </h2>
          {description && (
            <p className={`mt-4 ${subtitleSizeClass} ${subtitleColorClass} max-w-2xl text-balance`}>
              {description.split('\n').map((line: string, i: number) => (
                <span key={i}>{line}{i < description.split('\n').length - 1 && <br />}</span>
              ))}
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
          {data.steps?.map((step: string, i: number) => (
            <div
              key={i}
              className="flex items-start gap-6 px-6 py-5"
            >
              {/* Index */}
              <div className="text-sm font-medium text-slate-400 pt-1 w-8">
                {String(i + 1).padStart(2, '0')}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="text-base font-medium text-slate-900">
                  {step}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  입력 항목에 따라 실시간으로 결과가 업데이트됩니다.
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action */}
        <div className="mt-12 flex items-center justify-end">
          <Link
            href="/estimate"
            className="inline-flex items-center gap-2 btn-primary h-14 px-8 text-lg font-bold"
          >
            예상 비용 계산하기
            <ArrowRight className="h-5 w-5" />
          </Link>
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
    <main className="min-h-screen bg-white relative flex flex-col">
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

        const { id, type, data } = section;

        // Use type instead of id for matching to support dynamically created sections
        switch (type) {
          case 'hero': return <Hero key={id} data={data} />;
          case 'valueProps': return <ValueProps key={id} data={data} />;
          case 'concept': return <ConceptSection key={id} data={data} />;
          case 'comparison': return <ComparisonSection key={id} data={data} />;
          case 'howItWorks': return <HowItWorksSection key={id} data={data} />;
          case 'useCases': return <UseCasesSection key={id} data={data} />;
          case 'why': return <WhySection key={id} data={data} />;
          case 'reporting': return <Reporting key={id} data={data} />;
          case 'estimateGuide': return <EstimateGuide key={id} data={data} />;
          case 'faq': return <FAQSection key={id} data={data} />;
          case 'imageCards': return <ImageCardsSection key={id} data={data} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
