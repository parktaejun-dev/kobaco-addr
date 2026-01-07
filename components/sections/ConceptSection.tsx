"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

type ConceptData = {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  image?: string;
  card?: {
    title?: string;
    description?: string;
    image?: string;
    stats?: { label: string; value: string }[];
    cta?: { label: string; target?: string; actionType?: string };
  };
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
          className="grid gap-10 lg:grid-cols-2 lg:gap-12 items-center"
        >
          {/* Left Content */}
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

          {/* Right Content (Flexible Card or Image) */}
          <div className="relative">
             {data.card ? (
                <div className="card p-6">
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 p-8 h-full flex flex-col justify-center">
                    {data.card.title && (
                      <div className="text-2xl font-extrabold tracking-tight text-slate-900 mb-3">
                        {data.card.title}
                      </div>
                    )}
                    
                    {data.card.image && (
                      <div className="mb-6 rounded-lg overflow-hidden border border-slate-200/50 shadow-sm">
                        <img src={data.card.image} alt={data.card.title || "Card image"} className="w-full h-auto object-cover" />
                      </div>
                    )}

                    {data.card.description && (
                      <p className="text-slate-600 leading-relaxed mb-6">
                        {data.card.description}
                      </p>
                    )}

                    {data.card.stats && data.card.stats.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {data.card.stats.map((stat, idx) => (
                          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="text-sm text-slate-500">{stat.label}</div>
                            <div className="mt-1 font-semibold text-slate-900">{stat.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {data.card.cta && (
                      <Link
                        href={data.card.cta.target || '#'}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 w-full sm:w-auto"
                      >
                        {data.card.cta.label}
                        <ArrowRight size={16} />
                      </Link>
                    )}
                  </div>
                </div>
             ) : data.image ? (
               <div className="rounded-2xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100">
                 <img src={data.image} alt={data.title} className="h-full w-full object-cover" />
               </div>
             ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
