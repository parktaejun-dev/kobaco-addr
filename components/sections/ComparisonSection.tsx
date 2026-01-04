"use client";

import { motion } from "framer-motion";
import { Tv2, Target } from "lucide-react";

type ComparisonData = {
  title: string;
  left: { label: string; headline: string; description: string; points: string[] };
  right: { label: string; headline: string; description: string; points: string[] };
};

export default function ComparisonSection({ data }: { data: ComparisonData }) {
  return (
    <section className="py-16 sm:py-24 bg-slate-50/60">
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

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Tv2 className="h-4 w-4" />
                {data.left.label}
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                {data.left.headline}
              </div>
              <p className="mt-3 text-slate-600">{data.left.description}</p>
              <ul className="mt-5 space-y-2 text-slate-700">
                {data.left.points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                <Target className="h-4 w-4" />
                {data.right.label}
              </div>
              <div className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                {data.right.headline}
              </div>
              <p className="mt-3 text-slate-600">{data.right.description}</p>
              <ul className="mt-5 space-y-2 text-slate-700">
                {data.right.points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
