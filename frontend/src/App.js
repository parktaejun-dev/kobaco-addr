import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

function App() {
  // State for AI Recommendation
  const [productName, setProductName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for Estimate Calculation
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [channelBudgets, setChannelBudgets] = useState({});
  const [duration, setDuration] = useState(1);
  const [estimateResult, setEstimateResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleRecommend = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendations([]);
    setEstimateResult(null); // Reset previous estimate

    try {
      const response = await axios.post(`${API_BASE_URL}/recommend/`, {
        product_name: productName,
        website_url: websiteUrl,
      });
      setRecommendations(response.data.recommendations);
    } catch (err) {
      setError('추천을 받아오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCalculateEstimate = async (e) => {
    e.preventDefault();
    setIsCalculating(true);
    setError(null);
    setEstimateResult(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/estimate/`, {
        selected_channels: selectedChannels,
        channel_budgets: channelBudgets,
        duration: parseInt(duration, 10),
        // Add other parameters if needed, using default values for now
        region_targeting: false,
        region_selections: {},
        audience_targeting: false,
        ad_duration: 15,
        custom_targeting: false,
        is_new_advertiser: false,
      });
      setEstimateResult(response.data);
    } catch (err) {
      setError('견적 계산 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleChannelSelection = (channelName) => {
    setSelectedChannels(prev =>
      prev.includes(channelName)
        ? prev.filter(c => c !== channelName)
        : [...prev, channelName]
    );
  };

  const handleBudgetChange = (channelName, budget) => {
    setChannelBudgets(prev => ({ ...prev, [channelName]: parseInt(budget, 10) || 0 }));
  };


  return (
    <div className="App">
      <header className="App-header">
        <h1>AI 광고 타겟 및 견적 시뮬레이터</h1>
      </header>
      <main>
        <div className="form-container">
          <h2>1. AI 타겟 추천</h2>
          <form onSubmit={handleRecommend}>
            {/* ... input fields for product name and URL ... */}
            <div className="form-group">
              <label htmlFor="productName">제품명</label>
              <input
                type="text"
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="예: 맛있는 닭가슴살"
              />
            </div>
            <div className="form-group">
              <label htmlFor="websiteUrl">웹사이트 URL</label>
              <input
                type="text"
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="예: https://example.com"
              />
            </div>
            <button type="submit" disabled={isLoading}>
              {isLoading ? '분석 중...' : 'AI 타겟 추천받기'}
            </button>
          </form>
        </div>

        {error && <div className="error-message">{error}</div>}

        {recommendations.length > 0 && (
          <div className="results-container">
            <h2>2. 견적 시뮬레이션</h2>
            <p>추천된 타겟(채널)을 선택하고 예산을 입력하여 견적을 계산하세요.</p>
            <form onSubmit={handleCalculateEstimate}>
              <div className="channel-selection">
                {recommendations.map((rec, index) => (
                  <div key={index} className="channel-item">
                    <input
                      type="checkbox"
                      id={`channel-${index}`}
                      checked={selectedChannels.includes(rec.name)}
                      onChange={() => handleChannelSelection(rec.name)}
                    />
                    <label htmlFor={`channel-${index}`}>{rec.name}</label>
                    {selectedChannels.includes(rec.name) && (
                      <input
                        type="number"
                        placeholder="예산(만원)"
                        className="budget-input"
                        onChange={(e) => handleBudgetChange(rec.name, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label htmlFor="duration">광고 기간 (개월)</label>
                <input
                  type="number"
                  id="duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min="1"
                />
              </div>
              <button type="submit" disabled={isCalculating}>
                {isCalculating ? '계산 중...' : '견적 계산하기'}
              </button>
            </form>
          </div>
        )}

        {estimateResult && (
          <div className="results-container">
            <h2>최종 견적서</h2>
            <div className="summary">
                <p><strong>총 예산:</strong> {estimateResult.summary.total_budget.toLocaleString()} 원</p>
                <p><strong>총 보장 노출수:</strong> {estimateResult.summary.total_impressions.toLocaleString()} 회</p>
                <p><strong>평균 CPV:</strong> {estimateResult.summary.average_cpv.toFixed(2)} 원</p>
            </div>
            <h3>채널별 상세</h3>
            <ul>
              {estimateResult.details.map((detail, index) => (
                <li key={index}>
                  <h4>{detail.channel}</h4>
                  <p>예산: {detail.budget.toLocaleString()} 원</p>
                  <p>보장 노출수: {detail.guaranteed_impressions.toLocaleString()} 회</p>
                  <p>최종 CPV: {detail.final_cpv.toFixed(2)} 원</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
