"use client";

import { motion } from "framer-motion";
import { Database, BarChart3, Layers3, Send } from "lucide-react";

type HowData = {
  title: string;
  subtitle?: string;
  steps: { title: string; description: string }[];
};

const icons = [Database, BarChart3, Layers3, Send];

export default function HowItWorksSection({ data }: { data: HowData }) {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {data.title}
          </h2>
          {data.subtitle ? (
            <p className="mt-3 text-lg text-slate-600">{data.subtitle}</p>
          ) : null}

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.steps.map((s, idx) => {
              const Icon = icons[idx] ?? Database;
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-semibold text-slate-400">
                      STEP {idx + 1}
                    </div>
                  </div>
                  <div className="mt-4 text-lg font-bold text-slate-900">
                    {s.title}
                  </div>
                  <p className="mt-2 text-slate-600">{s.description}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
