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
      </div>
    </div>
  );
}
