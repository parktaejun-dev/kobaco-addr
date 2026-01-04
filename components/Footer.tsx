import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900">
      <div className="section-wrap py-16">
        {/* Top: Sitemap Style */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          <div className="space-y-4">
            <div className="relative h-8 w-28 invert">
              <Image
                src="/kobaco_logo.png"
                alt="KOBACO"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs">
              공신력 있는 데이터 기반<br />
              TV 타게팅 솔루션, KOBACO Addressable TV
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-12 gap-y-6">
            <div className="space-y-4">
              <h4 className="text-white text-sm font-bold tracking-tight">서비스</h4>
              <ul className="space-y-3 text-sm text-slate-500 font-medium">
                <li><Link href="/estimate" className="hover:text-white transition-colors">견적 시뮬레이션</Link></li>
                <li><Link href="#valueProps" className="hover:text-white transition-colors">주요 특장점</Link></li>
                <li><Link href="#useCases" className="hover:text-white transition-colors">활용 사례</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-white text-sm font-bold tracking-tight">이용 가이드</h4>
              <ul className="space-y-3 text-sm text-slate-500 font-medium">
                <li><Link href="#estimateGuide" className="hover:text-white transition-colors">견적 가이드</Link></li>
                <li><Link href="#howItWorks" className="hover:text-white transition-colors">작동 방식</Link></li>
                <li><Link href="#faq" className="hover:text-white transition-colors">자주 묻는 질문</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Bottom: Business Information */}
        <div className="pt-8 border-t border-slate-900 flex flex-col gap-6">
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-[10px] text-slate-600 font-medium uppercase tracking-tighter">
            <span>한국방송광고진흥공사</span>
            <span className="text-slate-800">|</span>
            <span>서울특별시 중구 세종대로 124 (태평로1가)</span>
            <span className="text-slate-800">|</span>
            <span>대표전화 : 02-731-0114</span>
            <span className="text-slate-800">|</span>
            <span>사업자등록번호 : 104-82-08574</span>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
              © {new Date().getFullYear()} KOBACO Addressable TV. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[10px] text-slate-700 font-black">
              <span className="px-2 py-0.5 border border-slate-800 rounded">v2.1 Stable</span>
              <span>ADMIN OPS ENABLED</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
