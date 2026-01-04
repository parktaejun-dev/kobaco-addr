"use client";

import { useEffect, useState } from 'react';

export default function UsagePage() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/log/usage')
      .then(res => res.json())
      .then(data => setLogs(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">📊 견적 사용 히스토리</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Vercel KV 연동 대기중 (Mock Data)</span>
        </header>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b">
              <tr>
                <th className="p-4">일시</th>
                <th className="p-4">광고주</th>
                <th className="p-4">제품명</th>
                <th className="p-4 text-right">총 예산(만원)</th>
                <th className="p-4 text-right">평균 CPV</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-600">
                    {new Date(log.date).toLocaleString('ko-KR')}
                  </td>
                  <td className="p-4 font-medium text-gray-900">{log.advertiser}</td>
                  <td className="p-4 text-gray-700">{log.product}</td>
                  <td className="p-4 text-right font-mono text-blue-600">
                    {log.budget.toLocaleString()}
                  </td>
                  <td className="p-4 text-right font-mono text-gray-600">
                    {log.cpv.toLocaleString()}원
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    아직 사용 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
