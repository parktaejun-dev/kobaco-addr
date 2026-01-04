"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQData {
    title: string;
    questions: FAQItem[];
}

export default function FAQSection({ data }: { data: FAQData }) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    if (!data || !data.questions?.length) return null;

    return (
        <section id="faq" className="section-pad bg-slate-50">
            <div className="section-wrap max-w-4xl mx-auto">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 text-center mb-12">
                    {data.title}
                </h2>
                <div className="space-y-4">
                    {data.questions.map((item, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                            >
                                <span className="font-bold text-slate-900 text-lg pr-4">{item.question}</span>
                                <ChevronDown
                                    className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
                                    size={20}
                                />
                            </button>
                            {openIndex === i && (
                                <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                                    {item.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
