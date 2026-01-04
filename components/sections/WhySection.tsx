"use client";

import { motion } from "framer-motion";
import { Shield, Radio, FileSpreadsheet } from "lucide-react";

type WhyData = {
  eyebrow?: string;
  title: string;
  description: string;
  cards: { title: string; description: string }[];
};

const whyIcons = [Radio, Shield, FileSpreadsheet];

export default function WhySection({ data }: { data: WhyData }) {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-slate-50 to-blue-50/60">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {data.eyebrow ? (
            <div className="text-sm font-semibold text-blue-700">{data.eyebrow}</div>
          ) : null}
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {data.title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-700">
            {data.description}
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {data.cards.map((c, idx) => {
              const Icon = whyIcons[idx] ?? Shield;
              return (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 text-lg font-bold text-slate-900">{c.title}</div>
                  <p className="mt-2 text-slate-600">{c.description}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
