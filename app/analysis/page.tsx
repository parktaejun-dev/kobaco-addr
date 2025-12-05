"use client"
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Recommendation {
  name: string;
  description: string;
  reason: string;
  confidence_score: number;
  key_factors: string[];
  full_path?: string;
  recommended_advertisers?: string;
}

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productName = searchParams.get("productName");
  const url = searchParams.get("url");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!productName) {
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      try {
        const res = await fetch("/api/biz/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_name: productName, url: url || "" })
        });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productName, url]);

  if (!productName) return <div>No product info provided.</div>;

  return (
    <div className="space-y-8">
          <Card>
            <CardHeader>
                <CardTitle>Product Understanding</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? <p>Loading...</p> : (
                    <>
                        <p>{data?.product_understanding || "Analyzing..."}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {data?.expanded_keywords?.map((k: string, i: number) => (
                                <span key={i} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                    {k}
                                </span>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
          </Card>

          <h2 className="text-2xl font-semibold">Recommended Segments</h2>
          {loading ? (
             <div className="space-y-4 animate-pulse">
                <div className="h-40 bg-gray-200 rounded"></div>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data?.recommendations?.map((rec: Recommendation, i: number) => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{rec.full_path || rec.name}</CardTitle>
                                <span className={`text-xs px-2 py-1 rounded font-bold text-white ${rec.confidence_score > 80 ? 'bg-green-500' : rec.confidence_score > 60 ? 'bg-yellow-500' : 'bg-gray-500'}`}>
                                    {rec.confidence_score}
                                </span>
                            </div>
                            <CardDescription>{rec.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="mb-2 text-sm text-gray-700"><strong>Reason:</strong> {rec.reason}</p>
                            <div className="mt-2">
                                {rec.key_factors?.map((f, idx) => (
                                    <span key={idx} className="inline-block bg-gray-200 rounded-full px-2 py-1 text-xs font-semibold text-gray-700 mr-2 mb-2">
                                        #{f}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
             </div>
          )}

          <div className="flex justify-end mt-8">
            <Button onClick={() => router.push(`/estimate?productName=${productName}`)}>
                Proceed to Estimate
            </Button>
          </div>
    </div>
  );
}

export default function AnalysisPage() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Analysis Results</h1>
            <Suspense fallback={<div>Loading analysis...</div>}>
                <AnalysisContent />
            </Suspense>
        </div>
    )
}
