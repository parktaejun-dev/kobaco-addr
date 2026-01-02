interface RecommendationListProps {
  recommendations: any[];
  productUnderstanding: string;
}

export default function RecommendationList({ recommendations, productUnderstanding }: RecommendationListProps) {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">🎯 AI 타겟 분석 결과</h2>
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">💡 AI 제품 분석</h3>
        <p className="text-blue-800 text-sm">{productUnderstanding}</p>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg text-gray-900">
                {idx + 1}. {rec.full_path || rec.name}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                rec.confidence_score > 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                적합도 {Math.round(rec.confidence_score)}점
              </span>
            </div>

            <p className="text-gray-600 text-sm mb-3">{rec.description}</p>

            {rec.key_factors && rec.key_factors.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {rec.key_factors.map((factor: string, i: number) => (
                  <span key={i} className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
                    {factor}
                  </span>
                ))}
              </div>
            )}

            <div className={`text-sm p-3 rounded-lg ${rec.confidence_score > 60 ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'}`}>
               <span className="font-bold">AI 추천 사유:</span> {rec.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
