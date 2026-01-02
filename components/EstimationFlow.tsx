"use client";
import { useEffect, useState } from 'react';
import { fetchConfig, fetchRecommendations, fetchEstimate, logInput } from '@/lib/api';
import ProductForm from '@/components/ProductForm';
import RecommendationList from '@/components/RecommendationList';
import BudgetPlanner from '@/components/BudgetPlanner';
import ResultDashboard from '@/components/ResultDashboard';
import { toast } from "sonner";
import { X } from 'lucide-react';

interface EstimationFlowProps {
  onClose?: () => void;
}

export default function EstimationFlow({ onClose }: EstimationFlowProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [productUnderstanding, setProductUnderstanding] = useState('');
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [lastEstimateRequest, setLastEstimateRequest] = useState<any>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingEst, setLoadingEst] = useState(false);

  useEffect(() => {
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
    <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">AI 타겟 분석 및 견적</h2>
                <p className="text-gray-500 text-sm">제품 정보를 입력하고 최적의 TV 광고 전략을 확인하세요.</p>
            </div>
            {onClose && (
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            )}
        </div>

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
            <div className="border-t pt-8">
                <ResultDashboard result={estimateResult} requestData={lastEstimateRequest} />
            </div>
        )}
    </div>
  );
}
