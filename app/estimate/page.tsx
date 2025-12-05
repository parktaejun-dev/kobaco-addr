"use client"
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function EstimateContent() {
  const searchParams = useSearchParams();
  const productName = searchParams.get("productName");
  const router = useRouter();

  const [channels, setChannels] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<{[key:string]: number}>({});
  const [duration, setDuration] = useState(3);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/system/init")
        .then(res => res.json())
        .then(data => {
            if (data.channels) {
                setChannels(data.channels);
                const initAlloc: any = {};
                data.channels.forEach((c: any) => initAlloc[c.channel_name] = 0);
                setAllocations(initAlloc);
            }
        })
        .catch(err => console.error("Failed to load init data", err));
  }, []);

  const handleCalculate = async () => {
    setLoading(true);
    try {
        const totalBudget = Object.values(allocations).reduce((a, b) => a + b, 0);

        const res = await fetch("/api/biz/estimate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                budget: totalBudget,
                channel_allocations: allocations,
                duration: duration,
                is_new_advertiser: false
            })
        });
        const json = await res.json();
        setResult(json);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateReport = () => {
      if (!result) return;
      // We pass data via encoded JSON in URL for MVP simplicity (avoiding complex state management or DB persistence for now)
      // In production, we should save to DB and pass ID.
      // But SOW "4. POST /api/log/history" exists. I should log it and maybe use that ID?
      // SOW didn't explicitly say report page fetches from DB ID, but that's cleaner.
      // However, "data/input_history" is described.
      // Let's stick to URL param for instant preview without DB requirement for "generating" report view.

      const reportPayload = {
          advertiserName: "Advertiser", // Simplified
          productName: productName,
          summary: result.summary,
          details: result.details,
          segments: [], // We don't have segments here in estimate page unless passed from analysis.
                        // For MVP flow, we might miss segments if not persisted.
                        // Ideally, flow is Analysis -> (Select Segments) -> Estimate -> Report.
                        // But here we are independent pages.
                        // I will leave segments empty or mock it if needed.
          date: new Date().toLocaleDateString()
      };

      const encoded = encodeURIComponent(JSON.stringify(reportPayload));
      router.push(`/report?data=${encoded}`);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Estimate Calculator: {productName}</h1>
        {result && (
            <Button onClick={handleGenerateReport} variant="outline">
                📄 Generate Proposal
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Budget Allocation (Unit: 10,000 KRW)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {channels.map(c => (
                    <div key={c.id} className="flex items-center space-x-4">
                        <label className="w-20 font-medium">{c.channel_name}</label>
                        <Input
                            type="number"
                            value={allocations[c.channel_name]}
                            onChange={(e) => setAllocations({...allocations, [c.channel_name]: Number(e.target.value)})}
                        />
                    </div>
                ))}
                <div className="pt-4">
                    <label className="block mb-2 font-medium">Duration (Months)</label>
                    <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                    />
                </div>
                <Button className="w-full mt-4" onClick={handleCalculate} disabled={loading}>
                    {loading ? "Calculating..." : "Calculate Estimate"}
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
                {result ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-100 p-4 rounded">
                                <div className="text-sm text-gray-500">Total Budget</div>
                                <div className="text-xl font-bold">{result.summary.total_budget.toLocaleString()} KRW</div>
                            </div>
                            <div className="bg-gray-100 p-4 rounded">
                                <div className="text-sm text-gray-500">Total Impressions</div>
                                <div className="text-xl font-bold">{result.summary.total_impressions.toLocaleString()}</div>
                            </div>
                            <div className="bg-gray-100 p-4 rounded">
                                <div className="text-sm text-gray-500">Avg CPV</div>
                                <div className="text-xl font-bold">{Math.round(result.summary.average_cpv).toLocaleString()} KRW</div>
                            </div>
                        </div>

                        <div className="h-64 w-full mb-4">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={result.details}
                                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="channel" />
                                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                  <Tooltip />
                                  <Legend />
                                  <Bar yAxisId="left" dataKey="guaranteed_impressions" name="Impressions" fill="#8884d8" />
                                  <Bar yAxisId="right" dataKey="budget" name="Budget" fill="#82ca9d" />
                                </BarChart>
                              </ResponsiveContainer>
                        </div>

                        <h3 className="font-semibold mb-2">Details</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Channel</th>
                                        <th className="text-right py-2">Budget</th>
                                        <th className="text-right py-2">Bonus(%)</th>
                                        <th className="text-right py-2">Impressions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.details.map((d: any, i: number) => (
                                        <tr key={i} className="border-b">
                                            <td className="py-2">{d.channel}</td>
                                            <td className="text-right py-2">{d.budget.toLocaleString()}</td>
                                            <td className="text-right py-2">{Math.round(d.total_bonus_rate)}%</td>
                                            <td className="text-right py-2">{d.guaranteed_impressions.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-40 text-gray-400">
                        Enter budget to see results
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function EstimatePage() {
    return (
        <div className="container mx-auto p-8">
            <Suspense fallback={<div>Loading calculator...</div>}>
                <EstimateContent />
            </Suspense>
        </div>
    )
}
