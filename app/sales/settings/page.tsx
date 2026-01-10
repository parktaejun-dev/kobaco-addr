'use client';

import { useState, useEffect } from 'react';

interface ConfigData {
  naverClientId: string;
  naverClientSecret: string;
  keywords: string[];
}

export default function SalesSettingsPage() {
  const [config, setConfig] = useState<ConfigData>({
    naverClientId: '',
    naverClientSecret: '********',
    keywords: [],
  });

  const [keywordsInput, setKeywordsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch('/api/sales/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setKeywordsInput(data.keywords.join(', '));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');

    try {
      // Parse keywords from comma-separated input
      const keywords = keywordsInput
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await fetch('/api/sales/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naverClientId: config.naverClientId,
          naverClientSecret: config.naverClientSecret,
          keywords,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setKeywordsInput(data.keywords.join(', '));
        setMessage('설정이 저장되었습니다.');
      } else {
        setMessage('저장 실패');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('저장 중 오류 발생');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Sales Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Naver News API 설정 및 검색 키워드 관리
            </p>
          </div>

          <div className="space-y-6">
            {/* Naver Client ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naver Client ID
              </label>
              <input
                type="text"
                value={config.naverClientId}
                onChange={(e) =>
                  setConfig({ ...config, naverClientId: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Naver API Client ID"
              />
            </div>

            {/* Naver Client Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naver Client Secret
              </label>
              <input
                type="password"
                value={config.naverClientSecret}
                onChange={(e) =>
                  setConfig({ ...config, naverClientSecret: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="변경하지 않으려면 비워두세요"
              />
              <p className="text-xs text-gray-500 mt-1">
                ******** = 기존 값 유지. 변경하려면 새 값을 입력하세요.
              </p>
            </div>

            {/* Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 키워드 (최대 20개)
              </label>
              <textarea
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="쉼표로 구분하여 입력 (예: 광고, 미디어, 마케팅, 캠페인)"
              />
              <p className="text-xs text-gray-500 mt-1">
                뉴스 검색에 사용될 키워드를 쉼표(,)로 구분하여 입력하세요.
              </p>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>

              <button
                onClick={() => (window.location.href = '/sales')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                대시보드로
              </button>

              {message && (
                <span
                  className={`text-sm ${
                    message.includes('성공') || message.includes('저장')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {message}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
