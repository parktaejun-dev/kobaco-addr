interface ResultDashboardProps {
  result: any;
}

export default function ResultDashboard({ result }: ResultDashboardProps) {
  if (!result || !result.summary) return null;

  const { summary, details, summary_comment } = result;

  return (
    <div className="space-y-6 mt-8">
      <h2 className="text-2xl font-bold">📊 시뮬레이션 결과</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
            <div className="text-gray-500 text-sm mb-1">총 집행 예산</div>
            <div className="text-2xl font-bold text-blue-600">
                {(summary.total_budget / 10000).toLocaleString()} <span className="text-sm text-gray-400">만원</span>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
             <div className="text-gray-500 text-sm mb-1">총 보장 노출수</div>
            <div className="text-2xl font-bold text-green-600">
                {summary.total_impressions.toLocaleString()} <span className="text-sm text-gray-400">회</span>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm text-center">
             <div className="text-gray-500 text-sm mb-1">평균 CPV</div>
            <div className="text-2xl font-bold text-purple-600">
                {Math.round(summary.average_cpv).toLocaleString()} <span className="text-sm text-gray-400">원</span>
            </div>
        </div>
      </div>

    {summary_comment && (
        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <h3 className="text-lg font-bold text-indigo-900 mb-2">🤖 AI 종합 의견</h3>
            <p className="text-indigo-800 leading-relaxed whitespace-pre-wrap">{summary_comment}</p>
        </div>
    )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                <tr>
                    <th className="px-6 py-3">채널</th>
                    <th className="px-6 py-3 text-right">예산 (원)</th>
                    <th className="px-6 py-3 text-right">보너스율</th>
                    <th className="px-6 py-3 text-right">보장 노출수</th>
                    <th className="px-6 py-3 text-right">예상 CPV</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {details.map((row: any) => (
                    <tr key={row.channel} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{row.channel}</td>
                        <td className="px-6 py-4 text-right">{row.budget.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">{row.total_bonus_rate.toFixed(0)}%</td>
                        <td className="px-6 py-4 text-right">{row.guaranteed_impressions.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">{Math.round(row.final_cpv).toLocaleString()}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
