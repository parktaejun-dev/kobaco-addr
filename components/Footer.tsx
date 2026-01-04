import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="section-wrap py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo & Brand */}
          <div className="lg:col-span-2">
            <div className="relative h-8 w-28 mb-4 invert">
              <Image
                src="/brand/kobaco-logo.svg"
                alt="KOBACO"
                fill
                className="object-contain object-left"
              />
            </div>
            <div className="text-base font-semibold text-white mb-2">
              KOBACO Addressable TV
            </div>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md">
              공신력 있는 데이터 기반 TV 타게팅 솔루션. 셋톱박스 데이터를 활용한 정교한 오디언스 타게팅으로 광고 효율을 극대화합니다.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div className="text-sm font-semibold text-white mb-4">바로가기</div>
            <nav className="grid gap-3 text-sm">
              <Link href="/estimate" className="text-slate-400 hover:text-white transition-colors">
                견적 산출
              </Link>
              <Link href="#valueProps" className="text-slate-400 hover:text-white transition-colors">
                주요 특징
              </Link>
              <Link href="#estimateGuide" className="text-slate-400 hover:text-white transition-colors">
                이용 가이드
              </Link>
            </nav>
          </div>

          {/* Company Info */}
          <div>
            <div className="text-sm font-semibold text-white mb-4">기관 정보</div>
            <div className="text-sm text-slate-400 space-y-2">
              <div className="font-medium text-slate-300">
                Korea Broadcast Advertising Corp.
              </div>
              <div>한국방송광고진흥공사</div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} KOBACO. All rights reserved.
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">안내:</span> 본 페이지는 KOBACO 어드레서블 TV 광고 상품 이해를 돕기 위한 안내 목적입니다.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
