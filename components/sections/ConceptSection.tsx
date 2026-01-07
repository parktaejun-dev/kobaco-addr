"use client";

import React from 'react';
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2 } from "lucide-react";

type ConceptData = {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  image?: string;
};

export default function ConceptSection({ data }: { data: ConceptData }) {
  return (
    <section className="section-pad bg-white">
      <div className="section-wrap">
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
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl text-balance">
              {data.title.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < data.title.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 text-balance">
              {data.description.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < data.description.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
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

          <div className="relative overflow-hidden rounded-2xl bg-slate-50">
             {data.image ? (
               <img src={data.image} alt={data.title} className="h-full w-full object-cover" />
             ) : (
                <div className="card p-6 h-full">
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 p-6 h-full flex flex-col justify-center">
                    <div className="text-sm font-semibold text-slate-700">요약</div>
                    <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                      "같은 채널, 다른 광고"
                    </div>
                    <p className="mt-3 text-slate-600">
                      셋톱박스 기반으로 오디언스를 분류하고, 가구 단위로 맞춤형 메시지를 전달합니다.
                    </p>
                  </div>
                </div>
             )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
