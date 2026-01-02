"use client";
import { useState } from 'react';
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  onRecommendation: (data: any) => void;
  isLoading: boolean;
}

export default function ProductForm({ onRecommendation, isLoading }: ProductFormProps) {
  const [productName, setProductName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [numRecommendations, setNumRecommendations] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecommendation({ productName, websiteUrl, numRecommendations });
  };

  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm">
      <h2 className="text-xl font-bold mb-4">📋 광고 캠페인 기본 정보</h2>
      <p className="text-gray-500 mb-6 text-sm">
        광고 제품명과 URL 주소를 입력해주시면, AI가 적합한 타깃을 추천해 드립니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제품명 (필수)
          </label>
          <input
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 갤럭시 S24, 친환경 샴푸"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제품 URL (선택 - AI 분석 정확도 향상)
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
             AI 추천 세그먼트 개수: {numRecommendations}개
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={numRecommendations}
            onChange={(e) => setNumRecommendations(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !productName}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} /> AI 분석 중...
            </>
          ) : (
            '🤖 AI 타겟 분석 요청'
          )}
        </button>
      </form>
    </div>
  );
}
