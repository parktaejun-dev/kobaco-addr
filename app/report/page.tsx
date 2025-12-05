"use client"
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Segment {
    name: string;
    full_path?: string;
    reason?: string;
    key_factors?: string[];
    confidence_score?: number;
}

interface ReportData {
    advertiserName: string;
    productName: string;
    summary: any;
    details: any[];
    segments: Segment[];
    date: string;
}

function ReportContent() {
    const searchParams = useSearchParams();
    const dataStr = searchParams.get("data");
    const [reportData, setReportData] = useState<ReportData | null>(null);

    useEffect(() => {
        if (dataStr) {
            try {
                const parsed = JSON.parse(decodeURIComponent(dataStr));
                setReportData(parsed);
            } catch (e) {
                console.error("Failed to parse report data", e);
            }
        }
    }, [dataStr]);

    if (!reportData) return <div>Loading Report...</div>;

    const { advertiserName, productName, summary, details, segments, date } = reportData;

    return (
        <div className="bg-white text-black p-8 max-w-4xl mx-auto print:max-w-none print:p-0 font-sans">
            <div className="flex justify-between items-center border-b-4 border-blue-800 pb-4 mb-8 print:mb-4">
                <h1 className="text-3xl font-bold text-blue-800">
                    <span className="text-red-600 mr-2">{advertiserName}</span>
                    AI Advertisement Optimization Plan
                </h1>
                <div className="text-right">
                    <div className="text-sm text-gray-500">{date}</div>
                    <div className="font-bold text-blue-800">KOBA-TA</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8 text-sm print:mb-4">
                <div className="border p-2"><span className="font-bold bg-gray-100 p-1 mr-2">Advertiser</span> {advertiserName}</div>
                <div className="border p-2"><span className="font-bold bg-gray-100 p-1 mr-2">Product</span> {productName}</div>
                <div className="border p-2"><span className="font-bold bg-gray-100 p-1 mr-2">Total Budget</span> {summary.total_budget.toLocaleString()} KRW</div>
                <div className="border p-2"><span className="font-bold bg-gray-100 p-1 mr-2">Duration</span> {summary.duration_months} Months</div>
            </div>

            <h2 className="text-xl font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4">Performance Summary (Monthly)</h2>
            <div className="grid grid-cols-3 gap-4 mb-8 print:mb-4">
                <div className="bg-gray-50 p-4 text-center border rounded">
                    <div className="text-gray-500 text-sm mb-1">Total Budget</div>
                    <div className="text-2xl font-bold text-blue-800">{summary.total_budget.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-4 text-center border rounded">
                    <div className="text-gray-500 text-sm mb-1">Total Impressions</div>
                    <div className="text-2xl font-bold text-blue-800">{summary.total_impressions.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-4 text-center border rounded">
                    <div className="text-gray-500 text-sm mb-1">Avg CPV</div>
                    <div className="text-2xl font-bold text-blue-800">{Math.round(summary.average_cpv).toLocaleString()}</div>
                </div>
            </div>

            <h2 className="text-xl font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4">Channel Details</h2>
            <table className="w-full text-sm mb-8 border-collapse border border-gray-300 print:mb-4">
                <thead>
                    <tr className="bg-blue-50">
                        <th className="border p-2">Channel</th>
                        <th className="border p-2 text-right">Budget</th>
                        <th className="border p-2 text-right">Base CPV</th>
                        <th className="border p-2 text-right">Bonus %</th>
                        <th className="border p-2 text-right">Surcharge %</th>
                        <th className="border p-2 text-right">Final CPV</th>
                        <th className="border p-2 text-right">Impressions</th>
                    </tr>
                </thead>
                <tbody>
                    {details.map((d: any, i: number) => (
                        <tr key={i}>
                            <td className="border p-2">{d.channel}</td>
                            <td className="border p-2 text-right">{d.budget.toLocaleString()}</td>
                            <td className="border p-2 text-right">{d.base_cpv.toFixed(1)}</td>
                            <td className="border p-2 text-right">{Math.round(d.total_bonus_rate)}%</td>
                            <td className="border p-2 text-right">{Math.round(d.total_surcharge_rate)}%</td>
                            <td className="border p-2 text-right">{d.final_cpv.toFixed(1)}</td>
                            <td className="border p-2 text-right">{d.guaranteed_impressions.toLocaleString()}</td>
                        </tr>
                    ))}
                    <tr className="bg-gray-50 font-bold">
                        <td className="border p-2">Total</td>
                        <td className="border p-2 text-right">{summary.total_budget.toLocaleString()}</td>
                        <td className="border p-2 text-right">-</td>
                        <td className="border p-2 text-right">-</td>
                        <td className="border p-2 text-right">-</td>
                        <td className="border p-2 text-right">{summary.average_cpv.toFixed(1)}</td>
                        <td className="border p-2 text-right">{summary.total_impressions.toLocaleString()}</td>
                    </tr>
                </tbody>
            </table>

            {segments && segments.length > 0 && (
                <>
                    <h2 className="text-xl font-bold text-blue-800 border-b-2 border-gray-200 pb-2 mb-4">Target Analysis</h2>
                    <div className="space-y-4 mb-8 print:mb-4">
                        {segments.map((seg, i) => (
                            <div key={i} className="border-b border-dashed pb-4 last:border-0">
                                <div className="flex items-center mb-1">
                                    <span className="font-bold mr-2">{i+1}. {seg.full_path || seg.name}</span>
                                    {seg.confidence_score && (
                                        <span className={`text-xs px-2 py-0.5 rounded text-white ${seg.confidence_score > 80 ? 'bg-red-500' : 'bg-gray-500'}`}>
                                            Score: {seg.confidence_score}
                                        </span>
                                    )}
                                </div>
                                {seg.key_factors && (
                                    <div className="text-sm text-blue-700 mb-1">
                                        <strong>Key Factors:</strong> {seg.key_factors.join(", ")}
                                    </div>
                                )}
                                <div className="text-sm text-gray-600">
                                    <strong>Reason:</strong> {seg.reason}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-12 pt-4 border-t text-center text-xs text-gray-500 print:mt-4">
                <p><strong>[Contact] KOBACO Cross Sales Team</strong></p>
                <p>02-731-7297 | 02-731-7296</p>
            </div>

            <button
                onClick={() => window.print()}
                className="fixed bottom-8 right-8 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg font-bold print:hidden hover:bg-blue-700 transition-colors"
            >
                Print Report
            </button>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReportContent />
        </Suspense>
    )
}
