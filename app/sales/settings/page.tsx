'use client';

import { useState, useEffect } from 'react';

interface RSSFeed {
  category: string;
  originalUrl: string;
  url: string;
  title: string;
  enabled?: boolean;
}

interface ConfigData {
  naverClientId: string;
  naverClientSecret: string;
  naverEnabled?: boolean;
  keywords: string[];
  rssFeeds: RSSFeed[];
  minScore: number;
}

export default function SalesSettingsPage() {
  const [config, setConfig] = useState<ConfigData>({
    naverClientId: '',
    naverClientSecret: '',
    naverEnabled: true,
    keywords: [],
    rssFeeds: [],
    minScore: 50,
  });

  const [keywordsInput, setKeywordsInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // RSS add form
  const [newCategory, setNewCategory] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await fetch('/api/sales/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setKeywordsInput((data.keywords || []).join(', '));
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
          naverEnabled: config.naverEnabled,
          keywords,
          rssFeeds: config.rssFeeds,
          minScore: config.minScore,
        }),
      });

      if (res.ok) {
        setMessage('설정이 저장되었습니다.');
        loadConfig();
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

  async function handleTestAndAddFeed() {
    if (!newUrl.trim()) {
      alert('URL을 입력해주세요.');
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/sales/config/test-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        // Check for duplicates
        const isDuplicateUrl = config.rssFeeds.some(
          (f) => f.url.toLowerCase() === data.feedUrl.toLowerCase()
        );
        if (isDuplicateUrl) {
          alert('이미 등록된 피드입니다.');
          return;
        }

        // Add to local state
        const newFeed: RSSFeed = {
          category: newCategory.trim() || '기타',
          originalUrl: newUrl.trim(),
          url: data.feedUrl,
          title: data.title || '(untitled)',
          enabled: true,
        };

        setConfig({
          ...config,
          rssFeeds: [...config.rssFeeds, newFeed],
        });

        // Clear form
        setNewCategory('');
        setNewUrl('');
        alert(`피드 발견: ${data.title || data.feedUrl}`);
      } else {
        alert(`오류: ${data.error}`);
      }
    } catch (error) {
      console.error('Test feed error:', error);
      alert('피드 검증 중 오류 발생');
    } finally {
      setTesting(false);
    }
  }

  function removeFeed(index: number) {
    const updated = [...config.rssFeeds];
    updated.splice(index, 1);
    setConfig({ ...config, rssFeeds: updated });
  }

  function toggleFeed(index: number) {
    const updated = [...config.rssFeeds];
    updated[index] = { ...updated[index], enabled: !(updated[index].enabled ?? true) };
    setConfig({ ...config, rssFeeds: updated });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">
          Naver News API 및 RSS 피드 설정
        </p>
      </div>

      <div className="space-y-6">
        {/* Naver API Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Naver News API
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{config.naverEnabled ? '활성' : '비활성'}</span>
              <button
                onClick={() => setConfig({ ...config, naverEnabled: !config.naverEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.naverEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.naverEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <input
                type="text"
                value={config.naverClientId}
                onChange={(e) =>
                  setConfig({ ...config, naverClientId: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Naver API Client ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret
              </label>
              <input
                type="password"
                value={config.naverClientSecret}
                onChange={(e) =>
                  setConfig({ ...config, naverClientSecret: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="변경하지 않으려면 비워두세요"
              />
              <p className="text-xs text-gray-500 mt-1">
                ******** = 기존 값 유지
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                검색 키워드 (최대 20개)
              </label>
              <textarea
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="쉼표로 구분 (예: 광고, 미디어, 마케팅)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                최소 점수 (0-100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={config.minScore}
                onChange={(e) =>
                  setConfig({ ...config, minScore: Number(e.target.value) })
                }
                className="w-24 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                이 점수 미만의 리드는 저장되지 않습니다. 권장: 50-60
              </p>
            </div>
          </div>
        </div>

        {/* RSS Feeds Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            RSS 피드 관리
          </h2>

          {/* Add Feed Form */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="카테고리 (예: 벤처)"
              />
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="URL (RSS 직접 또는 웹페이지)"
              />
            </div>
            <button
              onClick={handleTestAndAddFeed}
              disabled={testing}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? '검증 중...' : '🔍 검증 및 추가'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              홈페이지 URL을 입력하면 RSS 피드를 자동으로 탐색합니다.
            </p>
          </div>

          {/* Feed List */}
          <div className="space-y-2">
            {config.rssFeeds.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                등록된 피드가 없습니다. 기본 피드가 사용됩니다.
              </div>
            ) : (
              config.rssFeeds.map((feed, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {feed.category}
                      </span>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {feed.title}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {feed.url}
                    </div>
                    {feed.originalUrl !== feed.url && (
                      <div className="text-xs text-gray-400 truncate">
                        원본: {feed.originalUrl}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <button
                      onClick={() => toggleFeed(index)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${(feed.enabled ?? true) ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                    >
                      <span
                        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${(feed.enabled ?? true) ? 'translate-x-5' : 'translate-x-1'
                          }`}
                      />
                    </button>
                    <button
                      onClick={() => removeFeed(index)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="삭제"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '저장 중...' : '저장'}
          </button>

          {message && (
            <span
              className={`text-sm ${message.includes('성공') || message.includes('저장')
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
  );
}
