"use client";
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('policies');
  const [data, setData] = useState<any>(null);
  
  // Edit State
  const [editingItem, setEditingItem] = useState<{ type: 'channel' | 'bonus' | 'surcharge' | 'segment', id: number } | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  // Segment Grouping & Filter State
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  // Per-category filters: { "CategoryName": "SelectedMiddleCategory" }
  const [categoryFilters, setCategoryFilters] = useState<Record<string, string>>({});

  // JSON Tab State
  const [jsonContent, setJsonContent] = useState<string>('');

  const router = useRouter();

  useEffect(() => {
    setData(null);
    setEditingItem(null);
    setExpandedCats({});
    setCategoryFilters({}); // Reset filters on tab change
    setJsonContent('');
    
    const token = localStorage.getItem('admin_token');
    if (!token) {
      toast.error("로그인이 필요합니다.");
      router.push('/admin/login');
      return;
    }

    const fetchData = async () => {
      try {
        let endpoint = '';
        if (activeTab === 'policies') endpoint = '/api/admin/policies';
        else if (activeTab === 'segments') endpoint = '/api/admin/segments';
        else if (activeTab === 'settings') endpoint = '/api/admin/settings';
        else if (activeTab === 'json') endpoint = '/api/admin/backup';

        if (endpoint) {
            const res = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            
            // Auto expand all for segments initially
            if (activeTab === 'segments' && Array.isArray(res.data)) {
                 const cats = res.data.reduce((acc: any, curr: any) => {
                    const cat = curr.category_large || 'Uncategorized';
                    acc[cat] = true;
                    return acc;
                }, {});
                setExpandedCats(cats);
            }

            // Init JSON editor
            if (activeTab === 'json') {
                setJsonContent(JSON.stringify(res.data, null, 2));
            }
        }
      } catch (e: any) {
        console.error(e);
        if (axios.isAxiosError(e) && e.response?.status === 401) {
            toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
            localStorage.removeItem('admin_token');
            router.push('/admin/login');
        }
      }
    };

    fetchData();
  }, [activeTab, router]);

  const handleLogout = () => {
      localStorage.removeItem('admin_token');
      router.push('/admin/login');
  }

  // Edit Handlers
  const startEdit = (item: any, type: 'channel' | 'bonus' | 'surcharge' | 'segment') => {
      setEditingItem({ type, id: item.id });
      setEditForm({ ...item });
  };

  const handleEditChange = (field: string, value: string | number) => {
      setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const cancelEdit = () => {
      setEditingItem(null);
      setEditForm({});
  };

  const saveEdit = async () => {
      if (!editingItem) return;
      const token = localStorage.getItem('admin_token');
      try {
          let endpoint = '';
          if (editingItem.type === 'channel') endpoint = `/api/admin/channels/${editingItem.id}`;
          else if (editingItem.type === 'bonus') endpoint = `/api/admin/bonuses/${editingItem.id}`;
          else if (editingItem.type === 'surcharge') endpoint = `/api/admin/surcharges/${editingItem.id}`;
          else if (editingItem.type === 'segment') endpoint = `/api/admin/segments/${editingItem.id}`;

          await axios.put(endpoint, editForm, {
              headers: { Authorization: `Bearer ${token}` }
          });

          // Re-fetch data
          let fetchEndpoint = '';
          if (activeTab === 'policies') fetchEndpoint = '/api/admin/policies';
          else if (activeTab === 'segments') fetchEndpoint = '/api/admin/segments';
          
          if (fetchEndpoint) {
              const res = await axios.get(fetchEndpoint, { headers: { Authorization: `Bearer ${token}` } });
              setData(res.data);
          }
          
          setEditingItem(null);
          toast.success("저장되었습니다.");
      } catch (e) {
          toast.error("저장에 실패했습니다.");
          console.error(e);
      }
  };

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

  // JSON Handlers
  const handleJsonDownload = () => {
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kobata_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const content = event.target?.result as string;
              JSON.parse(content); // Validate JSON
              setJsonContent(content);
              toast.success("JSON loaded. Review and click 'Apply Changes' to save.");
          } catch (err) {
              toast.error("Invalid JSON file");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  const handleJsonApply = async () => {
      if (!window.confirm("WARNING: This will overwrite ALL data in the database. Are you sure?")) return;
      
      const token = localStorage.getItem('admin_token');
      try {
          const parsed = JSON.parse(jsonContent);
          await axios.post('/api/admin/restore', parsed, {
               headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("Database restored successfully!");
          // Reload data
          setData(parsed);
      } catch (err: any) {
          toast.error(`Restore failed: ${err.response?.data?.detail || err.message}`);
      }
  };

  // Segment Grouping Logic (No global filtering here)
  const groupedSegments = useMemo(() => {
    if (activeTab !== 'segments' || !Array.isArray(data)) return {};
    return data.reduce((acc: any, curr: any) => {
        const cat = curr.category_large || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {});
  }, [data, activeTab]);

  const toggleCategory = (cat: string) => {
      setExpandedCats(prev => ({
          ...prev,
          [cat]: !prev[cat]
      }));
  };
  
  const handleCategoryFilterChange = (category: string, value: string) => {
      setCategoryFilters(prev => ({ ...prev, [category]: value }));
  }

  // Render Helpers
  const renderInput = (field: string, type: 'text' | 'number' = 'text', isTextArea: boolean = false) => {
      if (isTextArea) {
          return (
              <textarea
                  value={editForm[field] || ''}
                  onChange={(e) => handleEditChange(field, e.target.value)}
                  className="border rounded px-2 py-1 w-full text-sm min-h-[60px]"
              />
          );
      }
      return (
          <input
              type={type}
              value={editForm[field] || ''}
              onChange={(e) => handleEditChange(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
              className="border rounded px-2 py-1 w-full text-sm"
          />
      );
  };

  const renderGroupedPolicyTable = (items: any[], type: 'bonus' | 'surcharge') => {
    const grouped = items.reduce((acc: any, curr: any) => {
        const ch = curr.channel_name || 'Common';
        if (!acc[ch]) acc[ch] = [];
        acc[ch].push(curr);
        return acc;
    }, {});

    return Object.entries(grouped).map(([channel, list]: [string, any]) => (
        <div key={channel} className="mb-6 last:mb-0">
             <h4 className="font-semibold text-gray-700 mb-2 px-2 border-l-4 border-blue-500 bg-gray-50 py-1 inline-block rounded-r">{channel}</h4>
             <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                            <th className="p-3">Type</th>
                            {type === 'bonus' && <th className="p-3">Condition (Min)</th>}
                            <th className="p-3">Rate</th>
                            <th className="p-3 w-[40%]">Description</th>
                            <th className="p-3 w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {list.map((item: any) => {
                            const isEditing = editingItem?.type === type && editingItem.id === item.id;
                            return (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-3">
                                        {type === 'bonus' ? item.bonus_type : item.surcharge_type}
                                    </td>
                                    {type === 'bonus' && (
                                        <td className="p-3">
                                            {isEditing ? renderInput('min_value', 'number') : item.min_value?.toLocaleString()}
                                        </td>
                                    )}
                                    <td className="p-3 font-medium text-blue-800">
                                        {isEditing ? renderInput('rate', 'number') : item.rate}
                                    </td>
                                    <td className="p-3">
                                        {isEditing ? renderInput('description') : <span className="text-gray-600">{item.description}</span>}
                                    </td>
                                    <td className="p-3">
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <button onClick={saveEdit} className="text-blue-600 font-medium text-xs">Save</button>
                                                <button onClick={cancelEdit} className="text-gray-500 text-xs">Cancel</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => startEdit(item, type)} className="text-gray-500 hover:text-blue-600 text-xs uppercase font-semibold">Edit</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
        </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-20">
        <h1 className="text-xl font-bold">🛠️ Admin Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
      </header>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
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
                 onClick={() => setActiveTab('json')}
                 className={`pb-2 px-2 font-medium ${activeTab === 'json' ? 'border-b-2 border-black' : 'text-gray-500'}`}
            >
                💾 Raw Data (Backup)
            </button>
            <button
                 onClick={() => setActiveTab('settings')}
                 className={`pb-2 px-2 font-medium ${activeTab === 'settings' ? 'border-b-2 border-black' : 'text-gray-500'}`}
            >
                ⚙️ Settings
            </button>
        </div>

        {activeTab === 'policies' && data && (
            <div className="space-y-8">
                {/* Channels Table */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="font-bold mb-4 text-lg border-b pb-2">Channels (매체 기본 단가)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700">
                                <tr>
                                    <th className="p-3 rounded-tl-lg">Channel Name</th>
                                    <th className="p-3">Base CPV</th>
                                    <th className="p-3">Audience CPV</th>
                                    <th className="p-3">Non-Target CPV</th>
                                    <th className="p-3 rounded-tr-lg w-24">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {data.channels?.map((ch: any) => {
                                    const isEditing = editingItem?.type === 'channel' && editingItem.id === ch.id;
                                    return (
                                        <tr key={ch.id} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium">{ch.channel_name}</td>
                                            <td className="p-3">
                                                {isEditing ? renderInput('base_cpv', 'number') : ch.base_cpv}
                                            </td>
                                            <td className="p-3">
                                                {isEditing ? renderInput('cpv_audience', 'number') : ch.cpv_audience}
                                            </td>
                                            <td className="p-3">
                                                {isEditing ? renderInput('cpv_non_target', 'number') : ch.cpv_non_target}
                                            </td>
                                            <td className="p-3">
                                                {isEditing ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={saveEdit} className="text-blue-600 font-medium text-xs">Save</button>
                                                        <button onClick={cancelEdit} className="text-gray-500 text-xs">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEdit(ch, 'channel')} className="text-gray-500 hover:text-blue-600 text-xs uppercase font-semibold">Edit</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bonuses & Surcharges */}
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="font-bold mb-6 text-lg border-b pb-2">Bonuses (보너스율)</h3>
                    {data.bonuses && renderGroupedPolicyTable(data.bonuses, 'bonus')}
                </div>

                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="font-bold mb-6 text-lg border-b pb-2">Surcharges (할증률)</h3>
                    {data.surcharges && renderGroupedPolicyTable(data.surcharges, 'surcharge')}
                </div>
            </div>
        )}

        {activeTab === 'segments' && data && (
             <div className="space-y-6">
                 <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center justify-between sticky top-20 z-10">
                    <h3 className="font-bold text-lg">Segments ({data.length})</h3>
                    <p className="text-xs text-gray-500">JSON의 모든 필드를 편집할 수 있습니다. 각 분류별 필터를 사용해 보세요.</p>
                 </div>

                 {Object.entries(groupedSegments).map(([category, segments]: [string, any]) => {
                     // Extract middle categories for this large category
                     const middleCats = Array.from(new Set(segments.map((s: any) => s.category_middle).filter(Boolean))).sort() as string[];
                     
                     // Filter segments if a filter is selected for this category
                     const currentFilter = categoryFilters[category] || '';
                     const displayedSegments = currentFilter 
                         ? segments.filter((s: any) => s.category_middle === currentFilter)
                         : segments;

                     return (
                         <div key={category} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                            <div className="w-full px-6 py-4 bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => toggleCategory(category)}>
                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                    {category} 
                                    <span className="text-gray-500 text-sm font-normal">({displayedSegments.length} / {segments.length})</span>
                                </h3>
                                
                                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                                    {middleCats.length > 0 && (
                                        <select 
                                            value={currentFilter}
                                            onChange={(e) => handleCategoryFilterChange(category, e.target.value)}
                                            className="text-xs border rounded px-2 py-1 bg-white text-gray-600 focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="">전체 ({middleCats.length})</option>
                                            {middleCats.map(mc => (
                                                <option key={mc} value={mc}>{mc}</option>
                                            ))}
                                        </select>
                                    )}
                                    <span className="text-gray-500 transform transition-transform duration-200" style={{ transform: expandedCats[category] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        ▼
                                    </span>
                                </div>
                            </div>
                            
                            {expandedCats[category] && (
                                <div className="overflow-auto max-h-[500px] border-t">
                                    <table className="w-full text-sm text-left border-collapse">
                                        <thead className="bg-white sticky top-0 shadow-sm z-10">
                                            <tr className="bg-gray-50 border-b">
                                                <th className="p-3 font-medium text-gray-600 w-[15%]">중분류</th>
                                                <th className="p-3 font-medium text-gray-600 w-[20%]">세그먼트명</th>
                                                <th className="p-3 font-medium text-gray-600 w-[30%]">상세 설명</th>
                                                <th className="p-3 font-medium text-gray-600 w-[25%]">키워드</th>
                                                <th className="p-3 font-medium text-gray-600 w-24">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {displayedSegments.map((seg: any) => {
                                                const isEditing = editingItem?.type === 'segment' && editingItem.id === seg.id;
                                                return (
                                                    <tr key={seg.id} className="hover:bg-gray-50 align-top">
                                                        <td className="p-3">
                                                            {isEditing ? renderInput('category_middle') : <span className="text-gray-600 font-medium">{seg.category_middle}</span>}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? renderInput('name') : <span className="font-bold text-blue-900">{seg.name}</span>}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? renderInput('description', 'text', true) : <p className="text-gray-600 leading-relaxed whitespace-pre-wrap text-xs">{seg.description}</p>}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? renderInput('keywords', 'text', true) : <p className="text-gray-500 text-xs italic">{seg.keywords}</p>}
                                                        </td>
                                                        <td className="p-3">
                                                            {isEditing ? (
                                                                <div className="flex flex-col gap-2">
                                                                    <button onClick={saveEdit} className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">Save</button>
                                                                    <button onClick={cancelEdit} className="text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => startEdit(seg, 'segment')} className="text-blue-500 hover:underline font-medium text-sm">Edit</button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                         </div>
                     );
                 })}
            </div>
        )}

        {activeTab === 'json' && data && (
            <div className="bg-white p-6 rounded-lg border shadow-sm h-full">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">💾 Raw Data Management</h3>
                    <div className="flex gap-3">
                        <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm cursor-pointer border">
                            📂 Upload JSON
                            <input type="file" accept=".json" onChange={handleJsonUpload} className="hidden" />
                        </label>
                        <button onClick={handleJsonDownload} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm">
                            ⬇️ Download JSON
                        </button>
                        <button onClick={handleJsonApply} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm">
                            ⚠️ Apply & Save to DB
                        </button>
                    </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                    데이터베이스의 전체 내용을 JSON 형식으로 직접 편집하거나 백업/복구할 수 있습니다. 
                    <br/><span className="text-red-500 font-bold">주의: "Apply & Save" 버튼을 누르면 현재 데이터베이스의 모든 내용이 덮어씌워집니다.</span>
                </p>
                <textarea
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                    className="w-full h-[600px] border rounded-md p-4 font-mono text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    spellCheck={false}
                />
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