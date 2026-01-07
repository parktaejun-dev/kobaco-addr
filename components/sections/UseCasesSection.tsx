"use client";

import React from 'react';
import { motion } from "framer-motion";
import { TrendingUp, Users, CheckCircle2 } from "lucide-react";

type UseCasesData = {
  title: string;
  titleSize?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
  layout?: 'grid' | 'split';
  imagePosition?: 'left' | 'right';
  image?: string; // Main image for split layout
  cases: { tag: string; title: string; description: string; image?: string }[];
};

const useCaseIcons = [TrendingUp, Users];

export default function UseCasesSection({ data }: { data: UseCasesData }) {
  const layout = data.layout || 'grid';
  const isSplit = layout === 'split';
  const imagePos = data.imagePosition || 'right';

  // Font size mappings
  const titleSizeClasses: Record<string, string> = {
    sm: 'text-2xl sm:text-3xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl',
  };
  const titleSizeClass = titleSizeClasses[data.titleSize || 'md'];
  
  // Font color mappings
  const colorClasses: Record<string, string> = {
    white: 'text-white',
    slate: 'text-slate-900',
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };
  const titleColorClass = colorClasses[data.titleColor || 'slate'];

  return (
    <section className="section-pad bg-white">
      <div className="section-wrap">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {/* Header */}
          <div className="mb-12 text-center max-w-3xl mx-auto">
            <h2 className={`${titleSizeClass} ${titleColorClass} font-extrabold tracking-tight text-balance`}>
              {data.title.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < data.title.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </h2>
            {(data.subtitle || data.description) && (
              <p className="mt-4 text-lg text-slate-600 text-balance">
                {(data.subtitle || data.description || '').split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < (data.subtitle || data.description || '').split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>

          {/* Layouts */}
          {isSplit ? (
            <div className={`grid gap-12 lg:grid-cols-2 items-center ${imagePos === 'left' ? '' : ''}`}>
              {/* Image Side - Order depends on lg:order class */}
              <div className={`relative rounded-2xl overflow-hidden shadow-xl border border-slate-100 bg-slate-50 aspect-[4/3] ${imagePos === 'left' ? 'lg:order-1' : 'lg:order-2'}`}>
                {data.image ? (
                  <img src={data.image} alt={data.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 font-medium">No Main Image</div>
                )}
              </div>

              {/* Content Side */}
              <div className={`space-y-8 ${imagePos === 'left' ? 'lg:order-2' : 'lg:order-1'}`}>
                {data.cases.map((c, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-blue-600 mb-1">{c.tag}</div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">{c.title}</h3>
                      <p className="text-slate-600 leading-relaxed">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Grid Layout (Default)
            <div className="grid gap-6 sm:grid-cols-2">
              {data.cases.map((c, idx) => {
                const Icon = useCaseIcons[idx % useCaseIcons.length] ?? TrendingUp;
                return (
                  <div
                    key={idx}
                    className="card p-8 bg-white border border-slate-100 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {c.tag}
                      </div>
                      {c.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-50 border border-slate-100">
                          <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-slate-900 mb-3">{c.title}</div>
                    <p className="text-slate-600 leading-relaxed">{c.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
