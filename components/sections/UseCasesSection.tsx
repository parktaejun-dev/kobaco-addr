"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users } from "lucide-react";

type UseCasesData = {
  title: string;
  subtitle?: string;
  cases: { tag: string; title: string; description: string }[];
};

const useCaseIcons = [TrendingUp, Users];

export default function UseCasesSection({ data }: { data: UseCasesData }) {
  return (
    <section className="section-pad bg-white">
      <div className="section-wrap">
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

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {data.cases.map((c, idx) => {
              const Icon = useCaseIcons[idx] ?? TrendingUp;
              return (
                <div
                  key={idx}
                  className="card p-6 bg-gradient-to-br from-white to-slate-50"
                >
                  <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <Icon className="h-3 w-3" />
                    {c.tag}
                  </div>
                  <div className="mt-4 text-xl font-bold text-slate-900">{c.title}</div>
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
