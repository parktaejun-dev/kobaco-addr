"use client";
import { useEffect, useState } from 'react';
import { fetchConfig, fetchRecommendations, fetchEstimate, logVisit, logInput } from '@/lib/api';
import ProductForm from '@/components/ProductForm';
import RecommendationList from '@/components/RecommendationList';
import BudgetPlanner from '@/components/BudgetPlanner';
import ResultDashboard from '@/components/ResultDashboard';
import { toast } from "sonner";
import Link from 'next/link';

export default function Home() {
  const [channels, setChannels] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [productUnderstanding, setProductUnderstanding] = useState('');
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [lastEstimateRequest, setLastEstimateRequest] = useState<any>(null);
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
        toast.error("Error: " + res.error);
      } else {
        setRecommendations(res.recommendations);
        setProductUnderstanding(res.product_understanding);
        toast.success("분석이 완료되었습니다.");
      }
    } catch (e) {
      toast.error("추천을 불러오는데 실패했습니다.");
    } finally {
      setLoadingRec(false);
    }
  };

  const handleEstimate = async (data: any) => {
    setLoadingEst(true);
    try {
      const res = await fetchEstimate(data);
      if (res.error) {
        toast.error("Error: " + res.error);
      } else {
        setEstimateResult(res);
        setLastEstimateRequest(data);
        toast.success("견적 산출이 완료되었습니다.");
        logInput({
            ...data,
            product_understanding: productUnderstanding,
            expanded_keywords: "",
            total_budget: Object.values(data.channel_budgets).reduce((a: any, b: any) => a + b, 0)
        });
      }
    } catch (e) {
      toast.error("견적 계산에 실패했습니다.");
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
                <Link href="/admin/login" className="text-sm text-gray-500 hover:text-gray-900">
                  Admin Login
                </Link>
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
                <ResultDashboard result={estimateResult} requestData={lastEstimateRequest} />
            )}
        </div>
    </main>
  );
}
