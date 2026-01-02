"use client";
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface BudgetPlannerProps {
  channels: any[];
  onEstimate: (data: any) => void;
  isLoading: boolean;
}

export default function BudgetPlanner({ channels, onEstimate, isLoading }: BudgetPlannerProps) {
  const [totalBudget, setTotalBudget] = useState(1000);
  const [duration, setDuration] = useState(1);
  const [adDuration, setAdDuration] = useState(15);
  const [audienceTargeting, setAudienceTargeting] = useState(false);
  const [regionTargeting, setRegionTargeting] = useState(false);
  const [channelBudgets, setChannelBudgets] = useState<{[key: string]: number}>({});
  const [isNewAdvertiser, setIsNewAdvertiser] = useState(false);

  // Initialize budgets evenly
  useEffect(() => {
    if (channels.length > 0) {
      const initialBudgets: any = {};
      const perChannel = Math.floor(totalBudget / channels.length);
      channels.forEach(ch => {
        initialBudgets[ch.channel_name] = perChannel;
      });
      // Adjust remainder to first channel
      const sum = perChannel * channels.length;
      if (sum < totalBudget) {
        initialBudgets[channels[0].channel_name] += (totalBudget - sum);
      }
      setChannelBudgets(initialBudgets);
    }
  }, [channels, totalBudget]);

  const handleBudgetChange = (chName: string, val: number) => {
     setChannelBudgets(prev => ({
         ...prev,
         [chName]: val
     }));
  };

  const handleSubmit = () => {
      const selected_channels = Object.keys(channelBudgets).filter(k => channelBudgets[k] > 0);
      onEstimate({
          selected_channels,
          channel_budgets: channelBudgets,
          duration,
          ad_duration: adDuration,
          audience_targeting: audienceTargeting,
          region_targeting: regionTargeting,
          region_selections: {}, // Simplified for demo
          custom_targeting: false,
          is_new_advertiser: isNewAdvertiser
      });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold mb-4">⚙️ 광고 집행 설정</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium mb-2">광고 소재 길이</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={adDuration === 15} onChange={() => setAdDuration(15)} name="adDuration" />
                        15초 (기본)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={adDuration === 20} onChange={() => setAdDuration(20)} name="adDuration" />
                        20초
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={adDuration === 30} onChange={() => setAdDuration(30)} name="adDuration" />
                        30초
                    </label>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-2">타겟팅 옵션</label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={audienceTargeting} onChange={(e) => setAudienceTargeting(e.target.checked)} />
                        오디언스 타겟팅
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={regionTargeting} onChange={(e) => setRegionTargeting(e.target.checked)} />
                        지역 타겟팅
                    </label>
                </div>
            </div>

             <div>
                <label className="block text-sm font-medium mb-2">집행 기간 (개월)</label>
                <input
                    type="number"
                    min="1"
                    max="12"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md"
                />
            </div>
             <div>
                <label className="block text-sm font-medium mb-2">신규 광고주 여부</label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isNewAdvertiser} onChange={(e) => setIsNewAdvertiser(e.target.checked)} />
                    신규 광고주 프로모션 적용
                </label>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-xl font-bold mb-4">💰 예산 배분 (단위: 만원)</h2>
        <div className="mb-6">
            <label className="block text-sm font-medium mb-2">총 예산</label>
            <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md text-lg font-bold"
            />
        </div>

        <div className="space-y-4">
            {channels.map(ch => (
                <div key={ch.channel_name} className="flex items-center gap-4">
                    <span className="w-20 font-medium">{ch.channel_name}</span>
                    <input
                        type="range"
                        min="0"
                        max={totalBudget}
                        value={channelBudgets[ch.channel_name] || 0}
                        onChange={(e) => handleBudgetChange(ch.channel_name, Number(e.target.value))}
                        className="flex-1"
                    />
                    <input
                        type="number"
                        value={channelBudgets[ch.channel_name] || 0}
                        onChange={(e) => handleBudgetChange(ch.channel_name, Number(e.target.value))}
                        className="w-24 px-2 py-1 border rounded text-right"
                    />
                </div>
            ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded text-right text-sm text-gray-600">
             배분 합계: {Object.values(channelBudgets).reduce((a, b) => a + b, 0).toLocaleString()} 만원
             / 총 예산: {totalBudget.toLocaleString()} 만원
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : '🧮 AI 최적화 플랜 생성하기'}
        </button>
      </div>
    </div>
  );
}
