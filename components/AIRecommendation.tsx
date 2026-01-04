// components/AIRecommendation.tsx
'use client';

import { Segment } from '@/lib/ai-client';

interface AIRecommendationProps {
    segments: Segment[];
    understanding: string;
    keywords: string[];
    isLoading?: boolean;
}

export function AIRecommendation({
    segments,
    understanding,
    keywords,
    isLoading = false,
}: AIRecommendationProps) {
    if (isLoading) {
        return (
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">데이터 분석 및 세그먼트 매칭 중...</span>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-slate-50 border border-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!segments.length) {
        return null;
    }

    return (
        <div className="space-y-6 pt-4">
            {/* AI Understanding */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                <h4 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Analysis Summary</h4>
                <p className="text-sm text-slate-700 leading-relaxed">
                    {understanding}
                </p>
                {keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {keywords.map(k => (
                            <span key={k} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-600">
                                #{k}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Segment Cards */}
            <div className="space-y-3">
                {segments.map((segment, index) => (
                    <SegmentCard key={segment.name} segment={segment} rank={index + 1} />
                ))}
            </div>
        </div>
    );
}

function SegmentCard({ segment, rank }: { segment: Segment; rank: number }) {
    const score = segment.confidence_score || 0;
    const isDefault = score <= 60;

    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white hover:border-slate-300 transition-colors">
            <div className="p-5 flex items-start gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-slate-400">RANK {rank}</span>
                        {isDefault && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                                기본 추천
                            </span>
                        )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2">
                        {segment.full_path || segment.name}
                    </h3>
                    {segment.description && (
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                            {segment.description}
                        </p>
                    )}

                    {segment.key_factors && segment.key_factors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {segment.key_factors.map((factor) => (
                                <span
                                    key={factor}
                                    className="px-2 py-1 bg-slate-50 text-slate-600 text-xs rounded border border-slate-200 font-medium"
                                >
                                    {factor}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">
                        {score}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Match Score
                    </div>
                </div>
            </div>

            {segment.reason && (
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    {segment.reason}
                </div>
            )}
        </div>
    );
}
