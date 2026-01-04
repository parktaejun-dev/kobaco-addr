import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-20">
      <div className="section-wrap">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-tight text-white">KOBACO</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold uppercase tracking-widest">Addressable</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-500">
              한국방송광고진흥공사(KOBACO)가 제공하는 데이터 기반 맞춤형 타겟팅 광고 솔루션입니다.
              <br />정교한 오디언스 타겟팅으로 TV 광고 효과를 극대화하세요.
            </p>
          </div>

          <div className="flex gap-8 text-sm font-bold">
            <Link href="/estimate" className="hover:text-white transition-colors">견적 시뮬레이션</Link>
            <Link href="/admin" className="hover:text-white transition-colors">관리자 로그인</Link>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-600">
          <p>© 2026 Korea Broadcast Advertising Corp. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-400 transition-colors">이용약관</a>
            <a href="#" className="hover:text-slate-400 transition-colors">개인정보처리방침</a>
            <a href="#" className="hover:text-slate-400 transition-colors">고객센터</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
