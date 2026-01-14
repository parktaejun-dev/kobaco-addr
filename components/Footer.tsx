import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 relative z-10">
      <div className="section-wrap">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          {/* Left Side */}
          <div className="space-y-6">
            <img
              src="https://n2wpsx55oxsmnkaa.public.blob.vercel-storage.com/webpage/logo_footer.png"
              alt="KOBACO Addressable TV"
              className="h-8 md:h-10 opacity-90"
            />
            <p className="max-w-md text-sm leading-relaxed text-slate-500 font-medium">
              한국방송광고진흥공사(KOBACO)가 제공하는 데이터 기반 맞춤형 타겟팅 광고 솔루션입니다.
              <br />정교한 오디언스 타겟팅으로 TV 광고 효과를 극대화하세요.
            </p>
          </div>

          {/* Right Side */}
          <div className="flex flex-col items-start md:items-end gap-6 text-sm">
            <div className="flex items-center gap-4 font-bold text-slate-300">
              <Link href="/estimate" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">견적 시뮬레이션</Link>
              <span className="text-slate-700">|</span>
              <Link href="/sales" className="hover:text-white transition-colors" prefetch={false} target="_blank" rel="noopener noreferrer">영업 사원 로그인</Link>
              <span className="text-slate-700">|</span>
              <Link href="/admin" className="hover:text-white transition-colors" prefetch={false} target="_blank" rel="noopener noreferrer">관리자 로그인</Link>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              © 2026 Korea Broadcast Advertising Corp. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
