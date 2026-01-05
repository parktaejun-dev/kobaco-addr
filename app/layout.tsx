import type { Metadata } from "next";
import "@fontsource/pretendard";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "KOBACO Addressable TV",
  description: "AI 기반 TV 광고 타겟 분석 및 견적 시뮬레이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
