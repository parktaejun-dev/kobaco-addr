import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3">
            <div className="relative h-10 w-32">
              <Image
                src="/brand/kobaco-logo.svg"
                alt="KOBACO"
                fill
                className="object-contain object-left"
                priority
              />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">KOBACO Addressable TV</div>
              <div className="mt-1 text-sm text-slate-600">공신력 있는 데이터 기반 TV 타게팅 솔루션</div>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-600">
            <a className="hover:text-slate-900 transition-colors" href="#estimate">견적 산출</a>
            <a className="hover:text-slate-900 transition-colors" href="#download">소개서 다운로드</a>
            <a className="hover:text-slate-900 transition-colors" href="#contact">문의하기</a>
          </div>

          <div className="text-sm text-slate-500">
            <div className="font-semibold text-slate-700">Korea Broadcast Advertising Corp.</div>
            <div className="mt-1">© {new Date().getFullYear()} KOBACO. All rights reserved.</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <div className="font-semibold text-slate-800">안내</div>
          <p className="mt-2 leading-relaxed">
            본 페이지는 KOBACO 어드레서블 TV 광고 상품 이해를 돕기 위한 안내 목적입니다.
            세부 조건 및 운영 방식은 캠페인 설정에 따라 달라질 수 있습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
