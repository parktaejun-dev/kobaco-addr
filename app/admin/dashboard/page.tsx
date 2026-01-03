"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('policies');
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      toast.error("로그인이 필요합니다.");
      router.push('/admin/login');
      return;
    }

    const fetchData = async () => {
      try {
        if (activeTab === 'policies') {
            const res = await axios.get('/api/admin/policies', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } else if (activeTab === 'segments') {
             const res = await axios.get('/api/admin/segments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
        } else if (activeTab === 'settings') {
             const res = await axios.get('/api/admin/settings', {
                headers: { Authorization: `Bearer ${token}` }
             });
             setData(res.data);
        }
      } catch (e) {
        console.error(e);
        // router.push('/admin/login'); // Redirect on error (expired token)
      }
    };

    fetchData();
  }, [activeTab, router]);

  const handleLogout = () => {
      localStorage.removeItem('admin_token');
      router.push('/admin/login');
  }

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
        await axios.post('/api/admin/settings', {
            gemini_api_key: formData.get('gemini_api_key'),
            deepseek_api_key: formData.get('deepseek_api_key'),
            active_model: formData.get('active_model')
        }, {
             headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Settings saved successfully");
    } catch (e) {
        toast.error("Failed to save settings");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🛠️ Admin Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-4 mb-6 border-b pb-1">
            <button
                onClick={() => setActiveTab('policies')}
                className={`pb-2 px-2 font-medium ${activeTab === 'policies' ? 'border-b-2 border-black' : 'text-gray-500'}`}
            >
                Sales Policies
            </button>
            <button
                 onClick={() => setActiveTab('segments')}
                 className={`pb-2 px-2 font-medium ${activeTab === 'segments' ? 'border-b-2 border-black' : 'text-gray-500'}`}
            >
                Segments
            </button>
            <button
                 onClick={() => setActiveTab('settings')}
                 className={`pb-2 px-2 font-medium ${activeTab === 'settings' ? 'border-b-2 border-black' : 'text-gray-500'}`}
            >
                ⚙️ AI Settings
            </button>
        </div>

        {activeTab === 'policies' && data && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="font-bold mb-4">Channels</h3>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-60">
                        {JSON.stringify(data.channels, null, 2)}
                    </pre>
                </div>
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="font-bold mb-4">Bonuses</h3>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-60">
                        {JSON.stringify(data.bonuses, null, 2)}
                    </pre>
                </div>
            </div>
        )}

        {activeTab === 'segments' && data && (
             <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h3 className="font-bold mb-4">Segments ({data.length})</h3>
                <div className="overflow-auto max-h-[600px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-3">Category</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Keywords</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((seg: any) => (
                                <tr key={seg.id}>
                                    <td className="p-3 text-gray-500">{seg.category_large} &gt; {seg.category_middle}</td>
                                    <td className="p-3 font-medium">{seg.name}</td>
                                    <td className="p-3 text-gray-500 truncate max-w-xs">{seg.keywords}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'settings' && data && (
            <div className="bg-white p-6 rounded-lg border shadow-sm max-w-2xl">
                <h3 className="font-bold mb-6 text-lg">AI Model Configuration</h3>
                <form onSubmit={handleSettingsSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Active Model</label>
                        <select
                            name="active_model"
                            defaultValue={data.active_model || 'gemini'}
                            className="w-full px-3 py-2 border rounded-md bg-white"
                        >
                            <option value="gemini">Google Gemini (Flash/Pro)</option>
                            <option value="deepseek">DeepSeek (OpenAI Compatible)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Select which AI model to use for analysis.</p>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-1">DeepSeek API Key</label>
                        <input
                            type="password"
                            name="deepseek_api_key"
                            placeholder={data.deepseek_api_key || "sk-..."}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                         <p className="text-xs text-gray-500 mt-1">Required if Active Model is DeepSeek.</p>
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-1">Gemini API Key</label>
                        <input
                            type="password"
                            name="gemini_api_key"
                            placeholder={data.gemini_api_key || "AIza..."}
                            className="w-full px-3 py-2 border rounded-md"
                        />
                        <p className="text-xs text-gray-500 mt-1">Required if Active Model is Gemini.</p>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        )}
      </div>
    </div>
  );
}
