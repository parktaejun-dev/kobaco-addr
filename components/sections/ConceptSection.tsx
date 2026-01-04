"use client";

import { motion } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";

type ConceptData = {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
};

export default function ConceptSection({ data }: { data: ConceptData }) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid gap-10 lg:grid-cols-2 lg:gap-12"
        >
          <div>
            {data.eyebrow && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span>{data.eyebrow}</span>
              </div>
            )}
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              {data.title}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              {data.description}
            </p>
            {data.bullets?.length ? (
              <ul className="mt-6 space-y-3">
                {data.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 p-6">
              <div className="text-sm font-semibold text-slate-700">요약</div>
              <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                "같은 채널, 다른 광고"
              </div>
              <p className="mt-3 text-slate-600">
                셋톱박스 기반으로 오디언스를 분류하고, 가구 단위로 맞춤형 메시지를 전달합니다.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">구매 단위</div>
                  <div className="mt-1 font-semibold text-slate-900">오디언스</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">운영 방식</div>
                  <div className="mt-1 font-semibold text-slate-900">타겟 중심</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
