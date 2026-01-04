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
            <div className="space-y-4">
                <div className="flex items-center gap-3 text-blue-600">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">🤖 KOBACO AI가 타겟을 분석 중입니다...</span>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (!segments.length) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* AI Understanding */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                    <strong>💡 AI가 이해한 제품:</strong> {understanding}
                </p>
                {keywords.length > 0 && (
                    <p className="text-sm text-blue-600 mt-2">
                        <strong>🔑 확장 키워드:</strong> {keywords.join(', ')}
                    </p>
                )}
            </div>

            {/* Segment Cards */}
            <div className="space-y-4">
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
        <div className="border rounded-xl overflow-hidden bg-white">
            {/* Header */}
            <div className="px-5 py-4 bg-gray-50 border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">
                            {rank}. {segment.full_path || segment.name}
                        </span>
                        {isDefault && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                기본 추천
                            </span>
                        )}
                    </div>
                    <div
                        className={`text-lg font-bold ${isDefault ? 'text-gray-500' : 'text-red-500'
                            }`}
                    >
                        {score.toFixed(0)}점
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
                {segment.description && (
                    <p className="text-sm text-gray-600">
                        <strong className="text-gray-700">📋 설명:</strong> {segment.description}
                    </p>
                )}

                {segment.key_factors && segment.key_factors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-gray-700">🔑 핵심 매칭:</span>
                        {segment.key_factors.map((factor) => (
                            <span
                                key={factor}
                                className="px-3 py-1 bg-green-500 text-white text-sm rounded-full font-medium"
                            >
                                {factor}
                            </span>
                        ))}
                    </div>
                )}

                {segment.reason && (
                    <div
                        className={`p-3 rounded-lg text-sm ${isDefault
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-green-50 text-green-800'
                            }`}
                    >
                        <strong>{isDefault ? 'ℹ️ 기본 추천 사유:' : '💡 AI 추천 사유:'}</strong>{' '}
                        {segment.reason}
                    </div>
                )}
            </div>
        </div>
    );
}
