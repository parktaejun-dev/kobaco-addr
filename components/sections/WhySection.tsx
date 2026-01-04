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
    <section className="section-pad bg-gradient-to-br from-slate-50 to-blue-50/60">
      <div className="section-wrap">
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
                <div key={idx} className="card p-6">
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
