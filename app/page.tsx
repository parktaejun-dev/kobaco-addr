"use client";
import { useEffect, useState } from 'react';
import { fetchConfig, fetchRecommendations, fetchEstimate, logVisit, logInput } from '@/lib/api';
import ProductForm from '@/components/ProductForm';
import RecommendationList from '@/components/RecommendationList';
import BudgetPlanner from '@/components/BudgetPlanner';
import ResultDashboard from '@/components/ResultDashboard';

export default function Home() {
  const [channels, setChannels] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [productUnderstanding, setProductUnderstanding] = useState('');
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingEst, setLoadingEst] = useState(false);

  useEffect(() => {
    logVisit();
    fetchConfig().then(res => {
      if(res.channels) setChannels(res.channels);
    });
  }, []);

  const handleRecommendation = async (data: any) => {
    setLoadingRec(true);
    setRecommendations([]);
    try {
      const res = await fetchRecommendations(data);
      if (res.error) {
        alert("Error: " + res.error);
      } else {
        setRecommendations(res.recommendations);
        setProductUnderstanding(res.product_understanding);
      }
    } catch (e) {
      alert("Failed to fetch recommendations");
    } finally {
      setLoadingRec(false);
    }
  };

  const handleEstimate = async (data: any) => {
    setLoadingEst(true);
    try {
      const res = await fetchEstimate(data);
      if (res.error) {
        alert("Error: " + res.error);
      } else {
        setEstimateResult(res);
        logInput({
            ...data,
            product_understanding: productUnderstanding,
            expanded_keywords: "", // Not storing here for briefness, but ideally should
            total_budget: Object.values(data.channel_budgets).reduce((a: any, b: any) => a + b, 0)
        });
      }
    } catch (e) {
      alert("Failed to calculate estimate");
    } finally {
      setLoadingEst(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
        <header className="bg-white border-b sticky top-0 z-10">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🚀</span>
                    <h1 className="font-bold text-xl tracking-tight">KOBA-TA <span className="text-blue-600">Target Advisor</span></h1>
                </div>
            </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            <ProductForm onRecommendation={handleRecommendation} isLoading={loadingRec} />

            <RecommendationList
                recommendations={recommendations}
                productUnderstanding={productUnderstanding}
            />

            {recommendations.length > 0 && (
                <div className="border-t pt-8">
                    <BudgetPlanner
                        channels={channels}
                        onEstimate={handleEstimate}
                        isLoading={loadingEst}
                    />
                </div>
            )}

            {estimateResult && (
                <ResultDashboard result={estimateResult} />
            )}
        </div>
    </main>
  );
}
