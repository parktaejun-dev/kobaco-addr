"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Lock, Layout, ShieldCheck, Database, BarChart3,
    Edit, Trash2, Plus, ChevronDown, Check, X,
    Eye, Save, Settings, Move, GripVertical, Image as ImageIcon, Upload, Loader2, MousePointerClick, Search, Menu
} from 'lucide-react';

type Tab = 'home' | 'content' | 'policies' | 'segments' | 'usage' | 'dashboard';

// Stats Interfaces
interface DashboardStats {
    todaySearchCount: number;
    todaySaves: number;
    todayUploads: number;
    todayTopTerms: string[];
    monthTopTerms: string[];
    recentTerms: string[];
}

// Helper: Image Library Modal
const ImageLibraryModal = ({ isOpen, onClose, onSelect }: { isOpen: boolean, onClose: () => void, onSelect: (url: string) => void }) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            axios.get('/api/admin/blob/list')
                .then(res => setImages(res.data))
                .catch(() => toast.error("Failed to load images"))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-10 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="font-black text-xl text-slate-800">이미지 라이브러리</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-slate-400 gap-2 font-bold"><Loader2 className="animate-spin" /> 불러오는 중...</div>
                    ) : images.length === 0 ? (
                        <div className="text-center py-20 text-slate-400 font-bold">이미지가 없습니다.</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {images.map((img) => (
                                <button
                                    key={img.url}
                                    onClick={() => { onSelect(img.url); onClose(); }}
                                    className="group relative aspect-square bg-white rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 hover:ring-2 hover:ring-blue-200 transition-all"
                                >
                                    <img src={img.url} alt="Library Item" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs">
                                        선택하기
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] p-1 truncate px-2">
                                        {new Date(img.uploadedAt).toLocaleDateString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper: Image Upload Component
const ImageUploader = ({ value, onChange, label }: { value: string, onChange: (url: string) => void, label: string }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;

        const file = e.target.files[0];
        setUploading(true);
        const toastId = toast.loading("Uploading image...");

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Using the new Blob API pattern
            const res = await axios.post(`/api/admin/blob/upload?filename=${file.name}`, file, {
                headers: { 'Content-Type': file.type }
            });

            onChange(res.data.url);
            toast.success("Image uploaded!");
        } catch (err) {
            console.error(err);
            toast.error("Upload failed");
        } finally {
            setUploading(false);
            toast.dismiss(toastId);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-3">
            <ImageLibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)} onSelect={onChange} />
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</label>
            <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-32 h-24 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 relative group flex-shrink-0 shadow-sm">
                    {value ? (
                        <>
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <a href={value} target="_blank" rel="noreferrer" className="text-white p-2 hover:text-blue-200"><Eye size={20} /></a>
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-300 flex flex-col items-center gap-1">
                            <ImageIcon size={24} />
                            <span className="text-[10px] font-bold">No Image</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-3 w-full">
                    <div className="flex gap-2 w-full">
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder="https://..."
                            className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-blue-500 transition-all font-mono text-slate-500 shadow-sm"
                        />
                    </div>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    
                    <div className="flex flex-wrap gap-2">
                        <button
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                        >
                            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            PC 업로드
                        </button>
                        <button
                            onClick={() => setShowLibrary(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-200"
                        >
                            <Database size={14} /> 라이브러리
                        </button>
                        
                        <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block" />

                        <button
                            disabled={!value}
                            onClick={() => onChange('')}
                            className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="URL만 제거"
                        >
                            해제
                        </button>
                        <button
                            disabled={!value}
                            onClick={async () => {
                                if (!confirm('Blob 스토리지에서 영구 삭제하시겠습니까?')) return;
                                try {
                                    await axios.delete('/api/admin/blob/delete', { data: { url: value } });
                                    onChange('');
                                    toast.success('이미지가 삭제되었습니다');
                                } catch (err) {
                                    toast.error('삭제 실패');
                                }
                            }}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Blob 영구 삭제"
                        >
                            삭제
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function AdminPortal() {
    // Middleware handles authentication
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');

    // Data State
    const [homeConfig, setHomeConfig] = useState<any>(null);
    const [policies, setPolicies] = useState<{ channels: any[], bonuses: any[], surcharges: any[] }>({ channels: [], bonuses: [], surcharges: [] });
    const [segments, setSegments] = useState<any[]>([]);
    const [usageLogs, setUsageLogs] = useState<any[]>([]);

    // Editor State
    const [editingSection, setEditingSection] = useState<{ id: string, type: string, content: any } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [jsonEditor, setJsonEditor] = useState<{ id: string, content: string } | null>(null);
    // Stats State
    const [stats, setStats] = useState<any>(null);
    // Mobile Sidebar State
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Segment Filter State
    const [segFilters, setSegFilters] = useState({ category: '', subcategory: '' });

    const filteredSegments = useMemo(() => {
        return segments.filter(seg => {
            const catMatch = !segFilters.category || seg['대분류'] === segFilters.category;
            const subMatch = !segFilters.subcategory || seg['중분류'] === segFilters.subcategory;
            return catMatch && subMatch;
        });
    }, [segments, segFilters]);

    const categories = useMemo(() => Array.from(new Set(segments.map(s => s['대분류']).filter(Boolean))), [segments]);
    const subcategories = useMemo(() => {
        const filtered = segFilters.category
            ? segments.filter(s => s['대분류'] === segFilters.category)
            : segments;
        return Array.from(new Set(filtered.map(s => s['중분류']).filter(Boolean)));
    }, [segments, segFilters.category]);

    useEffect(() => {
        loadTabData();
    }, [activeTab]);

    const loadTabData = async () => {
        try {
            if (activeTab === 'dashboard') {
                const res = await axios.get('/api/admin/stats/overview');
                setStats(res.data);
            } else if (activeTab === 'content') {
                const res = await axios.get('/api/admin/content?type=home');
                setHomeConfig(res.data);
            } else if (activeTab === 'policies') {
                const [ch, bo, sc] = await Promise.all([
                    axios.get('/api/admin/policy?type=channels'),
                    axios.get('/api/admin/policy?type=bonuses'),
                    axios.get('/api/admin/policy?type=surcharges'),
                ]);
                setPolicies({ channels: ch.data, bonuses: bo.data, surcharges: sc.data });
            } else if (activeTab === 'segments') {
                const res = await axios.get('/api/admin/policy?type=segments');
                const segmentData = res.data.data || res.data;
                setSegments(segmentData);
            } else if (activeTab === 'usage') {
                const res = await axios.get('/api/log/usage');
                setUsageLogs(res.data);
            }
        } catch (e) {
            // Stats failing shouldn't break the app
            if (activeTab !== 'dashboard') toast.error("Failed to load data");
        }
    };

    // --- Content Builder Handlers ---

    const updateSectionOrder = async (newList: any[]) => {
        const newConfig = { ...homeConfig, sections: newList };
        setHomeConfig(newConfig);
        try {
            // Use new robust API
            await axios.post('/api/admin/home/save', { sections: newList });
            toast.success("순서가 저장되었습니다.");
        } catch (e) {
            toast.error("순서 저장 실패");
        }
    };

    const toggleSection = async (id: string, current: boolean) => {
        const newSections = homeConfig.sections.map((s: any) =>
            s.id === id ? { ...s, enabled: !current } : s
        );
        updateSectionOrder(newSections);
    };

    const addSection = async (type: string) => {
        try {
            // Fallback to legacy creation Logic via save_home trick or implement properly? 
            // Phase 17 specifies fixed templates. 
            // 'addSection' implies enabling a disabled section or appending a new one if allowed (repeater?)
            // For now, keep legacy behavior but route via home save
            const res = await axios.post('/api/admin/content', { action: 'create_section', type });
            toast.success(`Section ${res.data.id} created!`);
            setShowAddModal(false);
            loadTabData();
        } catch (e) {
            toast.error("Failed to add section");
        }
    };

    const deleteSection = async (id: string) => {
        if (!window.confirm("정말 이 섹션을 영구 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.")) return;

        const toastId = toast.loading("삭제 중...");
        try {
            await axios.delete('/api/admin/section/delete', { data: { id } });
            // Remove from local state
            setHomeConfig((prev: any) => ({
                ...prev,
                sections: prev.sections.filter((s: any) => s.id !== id)
            }));
            toast.success("섹션이 삭제되었습니다");
        } catch (err) {
            toast.error("삭제 실패");
        } finally {
            toast.dismiss(toastId);
        }
    };

    const openEditor = async (section: any) => {
        const res = await axios.get(`/api/admin/content?type=section&id=${section.id}`);
        setEditingSection({ ...section, content: res.data });
    };

    const saveSectionContent = async () => {
        if (!editingSection) return;
        const toastId = toast.loading("Saving...");
        try {
            // Sanitize Data for UseCases (Auto-fill missing tags)
            let finalData = editingSection.content;
            if (editingSection.type === 'useCases' && Array.isArray(finalData.cases)) {
                finalData = {
                    ...finalData,
                    cases: finalData.cases.map((c: any) => ({
                        ...c,
                        tag: c.tag || "General" // Fallback for missing tags
                    }))
                };
            }

            // Use New Robust API
            await axios.post('/api/admin/section/save', {
                id: editingSection.id,
                type: editingSection.type,
                data: finalData
            });

            toast.success("Changes saved!");
            setEditingSection(null);
            loadTabData();
        } catch (e: any) {
            // Handle Zod Validation Errors
            const msg = e.response?.data?.message || e.message || "Save failed";
            if (e.response?.data?.error === 'Validation Error') {
                toast.error(`입력값 오류: ${msg}`, { duration: 5000 });
            } else {
                toast.error(`저장 실패: ${msg}`);
            }
            console.error(e);
        } finally {
            toast.dismiss(toastId);
        }
    };

    // --- Policy Handlers (Simple Edit) ---
    const savePolicyEdit = async (type: 'channels' | 'bonuses' | 'surcharges' | 'segments', newList: any[]) => {
        try {
            await axios.post('/api/admin/policy', { type, data: newList });
            toast.success("Saved to JSON");
            loadTabData();
        } catch (e: any) {
            const msg = e.response?.data?.error || e.response?.data?.message || e.message || "Save failed";
            toast.error(`저장 실패: ${msg}`);
            console.error(e);
        }
    };

    // --- JSON Editor Handler ---
    const saveJsonContent = async () => {
        if (!jsonEditor) return;
        try {
            const parsed = JSON.parse(jsonEditor.content);

            // Check if this is a policy type
            if (['channels', 'bonuses', 'surcharges', 'segments'].includes(jsonEditor.id)) {
                await axios.post('/api/admin/policy', { type: jsonEditor.id, data: parsed });
                toast.success("정책 데이터 저장됨!");
            } else if (jsonEditor.id === 'home') {
                await axios.post('/api/admin/content', {
                    action: 'save_home',
                    content: parsed
                });
                toast.success("메인 구성 데이터 저장됨!");
            } else {
                await axios.post('/api/admin/content', {
                    action: 'save_section',
                    id: jsonEditor.id,
                    content: parsed
                });
                toast.success("섹션 데이터 저장됨!");
            }
            setJsonEditor(null);
            loadTabData();
        } catch (e: any) {
            const msg = e.response?.data?.error || e.response?.data?.message || e.message || "Save failed";
            toast.error(`JSON 저장 실패: ${msg}`);
        }
    };

    // --- Render Helpers ---

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 z-30 flex items-center px-4 gap-3">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white p-2">
                    <Menu size={24} />
                </button>
                <span className="text-white font-bold">KOBACO Admin</span>
            </div>

            {/* Sidebar Overlay (Mobile) */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-20"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 shadow-2xl z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <button
                    onClick={() => { setActiveTab('home'); setSidebarOpen(false); }}
                    className="p-8 border-b border-white/10 text-left hover:bg-white/5 transition-all group"
                >
                    <h2 className="text-xl font-black tracking-tighter text-blue-400 group-hover:text-blue-300">KOBACO Addressable</h2>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">관리자 페이지</p>
                </button>
                <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
                    {[
                        { id: 'content', label: '섹션 관리', icon: Layout },
                        { id: 'policies', label: '정책 관리', icon: ShieldCheck },
                        { id: 'segments', label: '세그먼트 DB', icon: Database },
                        { id: 'usage', label: '사용 기록', icon: BarChart3 },
                    ].map(item => (
                        <button key={item.id} onClick={() => { setActiveTab(item.id as Tab); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-white/10 flex flex-col gap-4 flex-shrink-0">
                    <a href="/" target="_blank" className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold"><Eye size={12} /> 미리보기 (Home)</a>
                    <button onClick={() => { sessionStorage.removeItem('admin_access'); window.location.reload(); }} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-2 font-bold"><X size={12} /> 로그아웃</button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 md:ml-64 p-4 md:p-12 pt-20 md:pt-12 flex flex-col min-h-screen">
                {activeTab !== 'home' && (
                    <header className="mb-12">
                        <h1 className="text-4xl font-black text-slate-900 capitalize tracking-tight">
                            {activeTab === 'content' ? '섹션 관리' : activeTab === 'policies' ? '정책 관리' : activeTab === 'segments' ? '세그먼트 DB' : '사용 기록'}
                        </h1>
                    </header>
                )}

                {/* Tab: Dashboard (Stats) */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">대시보드</h1>
                            <p className="text-slate-500 mt-2 font-medium">시스템 현황 및 통계 데이터를 확인합니다.</p>
                        </header>

                        {/* Top Stats Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Search size={20} /></div>
                                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500 uppercase">Today</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">{stats?.todaySearchCount?.toLocaleString() || 0}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">일일 검색 횟수</div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><MousePointerClick size={20} /></div>
                                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500 uppercase">Today</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">{stats?.todayCtaCount?.toLocaleString() || 0}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">CTA 클릭 수</div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Save size={20} /></div>
                                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500 uppercase">Today</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">{stats?.todaySaves?.toLocaleString() || 0}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">관리자 저장 횟수</div>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between h-40">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><Upload size={20} /></div>
                                    <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold text-slate-500 uppercase">Today</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-black text-slate-800">{stats?.todayUploads?.toLocaleString() || 0}</div>
                                    <div className="text-xs font-bold text-slate-400 mt-1">이미지 업로드</div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Navigation Panel */}
                        <div>
                            <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight">빠른 메뉴 이동</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                {[
                                    { id: 'content', label: '섹션 관리', desc: '메인 페이지의 구성 요소를 편집하고 배치 순서를 변경합니다.', icon: Layout, color: 'bg-blue-500' },
                                    { id: 'policies', label: '정책 관리', icon: ShieldCheck, desc: '채널별 CPV, 보너스 비율, 할증 조건 등을 표 형식으로 수정합니다.', color: 'bg-indigo-500' },
                                    { id: 'segments', label: '세그먼트 DB', icon: Database, desc: 'AI 분석의 기반이 되는 오디언스 세그먼트 데이터를 조회하고 필터링합니다.', color: 'bg-emerald-500' },
                                    { id: 'usage', label: '사용 기록', icon: BarChart3, desc: '사용자들의 견적 생성 내역 및 시스템 로그를 확인합니다.', color: 'bg-slate-700' },
                                ].map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id as Tab)}
                                        className="p-8 bg-white border border-slate-200 rounded-[2rem] text-left hover:border-blue-500 hover:shadow-xl transition-all group active:scale-[0.98]"
                                    >
                                        <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-200 transition-transform group-hover:scale-110`}>
                                            <item.icon size={28} />
                                        </div>
                                        <h3 className="text-xl font-black text-slate-800 mb-2">{item.label}</h3>
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed">{item.desc}</p>
                                        <div className="mt-6 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            바로가기 <Plus size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Content (Section Manager) */}
                {activeTab === 'content' && homeConfig && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">섹션 구성 및 순서</h3>
                                <p className="text-slate-500 font-medium">섹션을 드래그하여 순서를 변경하거나 노출 여부를 설정하세요.</p>
                            </div>
                            <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                                <Plus size={20} /> 새 섹션 추가
                            </button>
                        </div>

                        <div className="space-y-4">
                            {homeConfig.sections.map((section: any, index: number) => (
                                <div
                                    key={section.id}
                                    className={`bg-white rounded-2xl border-2 transition-all ${section.enabled ? 'border-transparent shadow-sm' : 'border-dashed border-slate-200 opacity-60'}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                        if (fromIndex !== index) {
                                            const newSections = [...homeConfig.sections];
                                            const [moved] = newSections.splice(fromIndex, 1);
                                            newSections.splice(index, 0, moved);
                                            updateSectionOrder(newSections);
                                        }
                                    }}
                                >
                                    <div className="p-6 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div
                                                className="flex flex-col items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing p-2 hover:text-blue-500 transition-colors"
                                                draggable
                                                onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                                            >
                                                <GripVertical size={20} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-lg text-slate-800 tracking-tight">{
                                                        section.id === 'hero' ? '히어로 섹션' :
                                                            section.id === 'valueProps' ? '서비스 특장점' :
                                                                section.id === 'howItWorks' ? '작동 방식' :
                                                                    section.id === 'faq' ? '자주 묻는 질문' :
                                                                        section.id === 'reporting' ? '리포트 안내' :
                                                                            section.id === 'estimateGuide' ? '견적 가이드' : 
                                                                                section.id.includes('imageCards') ? '이미지 카드 섹션' : section.id
                                                    }</span>
                                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded uppercase">{section.type}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1 font-bold">드래그하여 순서를 변경할 수 있습니다.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => openEditor(section)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 font-bold text-sm transition-all">
                                                <Edit size={16} /> 내용 편집
                                            </button>
                                            <button onClick={() => toggleSection(section.id, section.enabled)} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${section.enabled ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                {section.enabled ? '노출 중' : '숨김'}
                                            </button>
                                            {section.type === 'hero' ? (
                                                <div className="p-2.5 text-slate-200 cursor-not-allowed group relative" title="히어로 섹션은 삭제할 수 없습니다.">
                                                    <Lock size={18} />
                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">삭제 불가</span>
                                                </div>
                                            ) : (
                                                <button onClick={() => deleteSection(section.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab: Policies (Editable Table UI) */}
                {activeTab === 'policies' && (
                    <div className="space-y-12 pb-20">
                        {/* 1. Channels */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800">1. 채널 설정</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setJsonEditor({ id: 'channels', content: JSON.stringify(policies.channels, null, 2) })} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-blue-500 border border-slate-100 rounded-lg">JSON 직접 편집</button>
                                    <button onClick={() => savePolicyEdit('channels', policies.channels)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                                        <Save size={16} /> 변경사항 저장
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto border rounded-2xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-slate-500 font-bold">
                                            <th className="p-4 text-left">채널명</th>
                                            <th className="p-4 text-right">기본 CPV</th>
                                            <th className="p-4 text-right">오디언스 CPV</th>
                                            <th className="p-4 text-right">논타겟 CPV</th>
                                            <th className="p-4 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {policies.channels.map((ch, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="p-3"><input type="text" value={ch.channel_name} onChange={e => {
                                                    const newList = [...policies.channels];
                                                    newList[i].channel_name = e.target.value;
                                                    setPolicies({ ...policies, channels: newList });
                                                }} className="w-full bg-transparent p-2 outline-none font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                <td className="p-3"><input type="number" value={ch.base_cpv} onChange={e => {
                                                    const newList = [...policies.channels];
                                                    newList[i].base_cpv = parseFloat(e.target.value);
                                                    setPolicies({ ...policies, channels: newList });
                                                }} className="w-full bg-transparent p-2 outline-none text-right font-bold text-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                <td className="p-3"><input type="number" value={ch.cpv_audience} onChange={e => {
                                                    const newList = [...policies.channels];
                                                    newList[i].cpv_audience = parseFloat(e.target.value);
                                                    setPolicies({ ...policies, channels: newList });
                                                }} className="w-full bg-transparent p-2 outline-none text-right font-medium text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                <td className="p-3"><input type="number" value={ch.cpv_non_target} onChange={e => {
                                                    const newList = [...policies.channels];
                                                    newList[i].cpv_non_target = parseFloat(e.target.value);
                                                    setPolicies({ ...policies, channels: newList });
                                                }} className="w-full bg-transparent p-2 outline-none text-right font-medium text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => {
                                                        const newList = policies.channels.filter((_, idx) => idx !== i);
                                                        setPolicies({ ...policies, channels: newList });
                                                    }} className="text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {/* Redundant add button removed as per Phase 11 */}
                            </div>
                        </div>

                        {/* 2. Bonuses */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800">2. 보너스 정책</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setJsonEditor({ id: 'bonuses', content: JSON.stringify(policies.bonuses, null, 2) })} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-blue-500 border border-slate-100 rounded-lg">JSON 직접 편집</button>
                                    <button onClick={() => savePolicyEdit('bonuses', policies.bonuses)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                                        <Save size={16} /> 변경사항 저장
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-8">
                                {['MBC', 'EBS', 'PP'].map(channel => {
                                    const channelBonuses = policies.bonuses.filter(b => b.channel_name === channel);
                                    return (
                                        <div key={channel} className="border rounded-2xl overflow-hidden shadow-sm">
                                            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <span className="font-black text-base text-slate-800">{channel} 매체 보너스</span>
                                                </div>
                                                <button onClick={() => {
                                                    const newList = [...policies.bonuses, { channel_name: channel, bonus_type: "volume", condition_type: "min_budget", min_value: 0, rate: 0.1, description: "신규 항목" }];
                                                    setPolicies({ ...policies, bonuses: newList });
                                                }} className="px-3 py-1.5 bg-white border border-slate-200 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-50 transition-all flex items-center gap-1">
                                                    <Plus size={14} /> 항목 추가
                                                </button>
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="bg-white/50 border-b border-slate-100">
                                                    <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                        <th className="p-4 text-left w-32">종류</th>
                                                        <th className="p-4 text-left w-32">조건</th>
                                                        <th className="p-4 text-right w-32">기준값</th>
                                                        <th className="p-4 text-right w-24">보너스율</th>
                                                        <th className="p-4 text-left">설명</th>
                                                        <th className="p-4 w-12"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {channelBonuses.map((bo, originalIndex) => {
                                                        const i = policies.bonuses.indexOf(bo);
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                                <td className="p-3"><input type="text" value={bo.bonus_type} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].bonus_type = e.target.value;
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3 text-slate-400 italic font-mono px-4 text-xs">{bo.condition_type}</td>
                                                                <td className="p-3"><input type="number" value={bo.min_value} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].min_value = parseFloat(e.target.value);
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none text-right font-medium text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3"><input type="number" step="0.01" value={bo.rate} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].rate = parseFloat(e.target.value);
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none text-right font-black text-green-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3"><input type="text" value={bo.description} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].description = e.target.value;
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3 text-center">
                                                                    <button onClick={() => {
                                                                        const newList = policies.bonuses.filter((_, idx) => idx !== i);
                                                                        setPolicies({ ...policies, bonuses: newList });
                                                                    }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {channelBonuses.length === 0 && (
                                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold italic">등록된 정책이 없습니다.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                                {/* Redundant add button removed as per Phase 11 */}
                            </div>
                        </div>

                        {/* 3. Surcharges */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-800">3. 할증 정책</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setJsonEditor({ id: 'surcharges', content: JSON.stringify(policies.surcharges, null, 2) })} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-blue-500 border border-slate-100 rounded-lg">JSON 직접 편집</button>
                                    <button onClick={() => savePolicyEdit('surcharges', policies.surcharges)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2">
                                        <Save size={16} /> 변경사항 저장
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-8">
                                {['MBC', 'EBS', 'PP'].map(channel => {
                                    const channelSurcharges = policies.surcharges.filter(s => s.channel_name === channel);
                                    return (
                                        <div key={channel} className="border rounded-2xl overflow-hidden shadow-sm">
                                            <div className="px-6 py-4 bg-slate-50 border-b flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                                    <span className="font-black text-base text-slate-800">{channel} 매체 할증</span>
                                                </div>
                                                <button onClick={() => {
                                                    const newList = [...policies.surcharges, { channel_name: channel, surcharge_type: "region", condition_value: "지역", rate: 0.1, description: "신규 할증" }];
                                                    setPolicies({ ...policies, surcharges: newList });
                                                }} className="px-3 py-1.5 bg-white border border-slate-200 text-orange-600 rounded-lg font-bold text-xs hover:bg-orange-50 transition-all flex items-center gap-1">
                                                    <Plus size={14} /> 항목 추가
                                                </button>
                                            </div>
                                            <table className="w-full text-sm">
                                                <thead className="bg-white/50 border-b border-slate-100">
                                                    <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                                        <th className="p-4 text-left w-32">종류</th>
                                                        <th className="p-4 text-left w-32">조건값</th>
                                                        <th className="p-4 text-right w-32">할증률</th>
                                                        <th className="p-4 text-left">설명</th>
                                                        <th className="p-4 w-12"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                    {channelSurcharges.map((sc, originalIndex) => {
                                                        const i = policies.surcharges.indexOf(sc);
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                                <td className="p-3"><input type="text" value={sc.surcharge_type} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].surcharge_type = e.target.value;
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3"><input type="text" value={sc.condition_value} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].condition_value = e.target.value;
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none font-medium text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3"><input type="number" step="0.01" value={sc.rate} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].rate = parseFloat(e.target.value);
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none text-right font-black text-orange-600 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3"><input type="text" value={sc.description} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].description = e.target.value;
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-2 outline-none text-slate-500 focus:bg-white focus:ring-2 focus:ring-blue-100 rounded-lg" /></td>
                                                                <td className="p-3 text-center">
                                                                    <button onClick={() => {
                                                                        const newList = policies.surcharges.filter((_, idx) => idx !== i);
                                                                        setPolicies({ ...policies, surcharges: newList });
                                                                    }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {channelSurcharges.length === 0 && (
                                                        <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold italic">등록된 정책이 없습니다.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                                {/* Redundant add button removed as per Phase 11 */}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Segments DB (View Only Table with Filtering) */}
                {activeTab === 'segments' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex-1">
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">세그먼트 데이터 조회</h3>
                                <p className="text-slate-500 font-medium mt-1">총 {segments.length}개 중 {filteredSegments.length}개 표시 중</p>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                <select
                                    className="px-4 py-2.5 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={segFilters.category}
                                    onChange={e => setSegFilters({ subcategory: '', category: e.target.value })}
                                >
                                    <option value="">대분류 전체</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select
                                    className="px-4 py-2.5 bg-slate-50 border rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={segFilters.subcategory}
                                    onChange={e => setSegFilters(prev => ({ ...prev, subcategory: e.target.value }))}
                                >
                                    <option value="">중분류 전체</option>
                                    {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button
                                    onClick={() => {
                                        const newSeg = { name: "새 세그먼트", ['대분류']: segFilters.category || "미지정", ['중분류']: segFilters.subcategory || "미지정", description: "설명", recommended_advertisers: "추천 광고주" };
                                        setSegments([newSeg, ...segments]);
                                    }}
                                    className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-sm transition-all shadow-xl shadow-emerald-100 flex items-center gap-2"
                                >
                                    <Plus size={16} /> 세그먼트 추가
                                </button>
                                <button onClick={() => setJsonEditor({ id: 'segments', content: JSON.stringify(segments, null, 2) })} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-blue-500 font-bold font-mono text-[10px] uppercase">JSON</button>
                                <button onClick={() => savePolicyEdit('segments', segments)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm transition-all shadow-xl shadow-blue-100 flex items-center gap-2">
                                    <Save size={16} /> 정책 저장
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                            <th className="p-4 text-left w-32">대분류</th>
                                            <th className="p-4 text-left w-32">중분류</th>
                                            <th className="p-4 text-left w-48">세그먼트명</th>
                                            <th className="p-4 text-right w-24">모수</th>
                                            <th className="p-4 text-right w-24">단가</th>
                                            <th className="p-4 text-left">설명</th>
                                            <th className="p-4 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-xs">
                                        {filteredSegments.slice(0, 100).map((seg, originalIndex) => {
                                            // Find index in original array to update correct item
                                            const i = segments.indexOf(seg);
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="p-3"><input type="text" value={seg['대분류']} onChange={e => {
                                                        const newList = [...segments];
                                                        newList[i]['대분류'] = e.target.value;
                                                        setSegments(newList);
                                                    }} className="w-full bg-transparent p-1.5 outline-none font-black text-blue-600 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                    <td className="p-3"><input type="text" value={seg['중분류']} onChange={e => {
                                                        const newList = [...segments];
                                                        newList[i]['중분류'] = e.target.value;
                                                        setSegments(newList);
                                                    }} className="w-full bg-transparent p-1.5 outline-none font-bold text-slate-600 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                    <td className="p-3"><input type="text" value={seg.name} onChange={e => {
                                                        const newList = [...segments];
                                                        newList[i].name = e.target.value;
                                                        setSegments(newList);
                                                    }} className="w-full bg-transparent p-1.5 outline-none font-black text-slate-800 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                    <td className="p-3"><input type="number" value={seg.count || 0} onChange={e => {
                                                        const newList = [...segments];
                                                        newList[i].count = parseInt(e.target.value) || 0;
                                                        setSegments(newList);
                                                    }} className="w-full bg-transparent p-1.5 outline-none text-right font-medium text-slate-500 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                    <td className="p-3"><input type="number" value={seg.unit_price || 0} onChange={e => {
                                                        const newList = [...segments];
                                                        newList[i].unit_price = parseInt(e.target.value) || 0;
                                                        setSegments(newList);
                                                    }} className="w-full bg-transparent p-1.5 outline-none text-right font-bold text-slate-700 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                    <td className="p-3"><input type="text" value={seg.description} onChange={e => {
                                                        const newList = [...segments];
                                                        newList[i].description = e.target.value;
                                                        setSegments(newList);
                                                    }} className="w-full bg-transparent p-1.5 outline-none text-slate-400 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                    <td className="p-3 text-center">
                                                        <button onClick={() => {
                                                            if (confirm('정말 삭제하시겠습니까?')) {
                                                                const newList = segments.filter((_, idx) => idx !== i);
                                                                setSegments(newList);
                                                            }
                                                        }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredSegments.length === 0 && (
                                            <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold italic">검색 결과가 없습니다.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                                {filteredSegments.length > 100 && (
                                    <div className="p-8 text-center bg-slate-50 text-slate-400 font-bold italic text-sm border-t border-slate-100">
                                        상위 100개 항목만 표시 중입니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Usage Logs (Real Data from policy/usage_logs.json) */}
                {activeTab === 'usage' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">최근 사용 기록</h3>
                                    <p className="text-slate-500 font-medium mt-1">시스템에서 발생한 견적 및 AI 분석 로그입니다.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black">실시간 기록 중</span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                            <th className="p-6 text-left">일시</th>
                                            <th className="p-6 text-left">종류</th>
                                            <th className="p-6 text-left">광고주 / 제품</th>
                                            <th className="p-6 text-right">총 예산</th>
                                            <th className="p-6 text-right">평균 CPV</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {usageLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-20 text-center text-slate-400 font-bold italic">기록된 로그가 없습니다.</td>
                                            </tr>
                                        ) : (
                                            usageLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6 text-slate-500 font-mono text-xs">
                                                        {new Date(log.date).toLocaleString('ko-KR')}
                                                    </td>
                                                    <td className="p-6">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${log.type === 'analysis' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                                                            }`}>
                                                            {log.type === 'analysis' ? 'AI 분석' : '인쇄/저장'}
                                                        </span>
                                                    </td>
                                                    <td className="p-6">
                                                        <div className="font-bold text-slate-900">{log.advertiser}</div>
                                                        <div className="text-xs text-slate-400">{log.product}</div>
                                                    </td>
                                                    <td className="p-6 text-right font-bold text-slate-700">
                                                        {log.budget?.toLocaleString()}원
                                                    </td>
                                                    <td className="p-6 text-right font-black text-blue-600">
                                                        {log.cpv?.toFixed(1)}원
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Section Editor (THE CORE OF THE NEW SPEC) */}
                {editingSection && (
                    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-white/20">
                            <div className="p-10 border-b flex justify-between items-center bg-white">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {editingSection.id === 'hero' ? '히어로 섹션' :
                                                editingSection.id === 'valueProps' ? '서비스 특장점' :
                                                    editingSection.id === 'concept' ? 'Addressable TV란?' :
                                                        editingSection.id === 'comparison' ? '기존 TV 비교' :
                                                            editingSection.id === 'howItWorks' ? '작동 방식' :
                                                                editingSection.id === 'useCases' ? '활용 사례' :
                                                                    editingSection.id === 'why' ? 'Why Addressable?' :
                                                                        editingSection.id === 'faq' ? '자주 묻는 질문' :
                                                                            editingSection.id === 'reporting' ? '리포트 안내' :
                                                                                editingSection.id === 'estimateGuide' ? '견적 가이드' : editingSection.id} 편집
                                        </h3>
                                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">{editingSection.type}</span>
                                    </div>
                                    <p className="text-slate-500 mt-2 font-medium">관리자 전용 편집 모드입니다. 수정 후 저장 버튼을 눌러주세요.</p>
                                </div>
                                <button onClick={() => setEditingSection(null)} className="w-12 h-12 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all text-slate-400 active:scale-90">✕</button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 space-y-10">
                                {/* Dynamic Form Content based on type */}

                                {/* HERO EDITOR */}
                                {editingSection.type === 'hero' && (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Eyebrow</label>
                                                <input type="text" value={editingSection.content.eyebrow || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, eyebrow: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Title (줄바꿈: Enter)</label>
                                                <textarea value={editingSection.content.title || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all min-h-[80px]" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtitle</label>
                                            <textarea value={editingSection.content.subtitle || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitle: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all min-h-[100px]" placeholder="줄바꿈은 Enter로 입력" />
                                        </div>

                                        {/* Style Options */}
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">아이브로우 배경</label>
                                                <select
                                                    value={editingSection.content.eyebrowBg || 'blue'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, eyebrowBg: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="blue">파란색 (기본)</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                    <option value="slate">회색</option>
                                                    <option value="none">없음 (텍스트만)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">아이브로우 크기</label>
                                                <select
                                                    value={editingSection.content.eyebrowSize || 'sm'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, eyebrowSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게 (기본)</option>
                                                    <option value="md">보통</option>
                                                    <option value="lg">크게</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 크기</label>
                                                <select
                                                    value={editingSection.content.titleSize || 'lg'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게</option>
                                                    <option value="md">보통</option>
                                                    <option value="lg">크게 (기본)</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 색상</label>
                                                <select
                                                    value={editingSection.content.titleColor || 'white'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleColor: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="white">흰색 (기본)</option>
                                                    <option value="slate">회색</option>
                                                    <option value="blue">파란색</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">부제목 크기</label>
                                                <select
                                                    value={editingSection.content.subtitleSize || 'lg'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitleSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게</option>
                                                    <option value="md">보통</option>
                                                    <option value="lg">크게 (기본)</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">부제목 색상</label>
                                                <select
                                                    value={editingSection.content.subtitleColor || 'slate'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitleColor: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="white">흰색</option>
                                                    <option value="slate">회색 (기본)</option>
                                                    <option value="blue">파란색</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Background Image</label>
                                            <ImageUploader
                                                label="Upload Background"
                                                value={editingSection.content.backgroundImage || ''}
                                                onChange={(url) => setEditingSection({ ...editingSection, content: { ...editingSection.content, backgroundImage: url } })}
                                            />
                                        </div>

                                        {/* KPIs Table */}
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">KPI Badges (Max 4)</label>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-slate-100">
                                                        {editingSection.content.stats?.map((stat: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="p-4 w-1/3"><input type="text" value={stat.value} placeholder="Value" onChange={e => {
                                                                    const newStats = [...(editingSection.content.stats || [])];
                                                                    newStats[i].value = e.target.value;
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, stats: newStats } });
                                                                }} className="w-full bg-transparent outline-none font-black text-slate-900" /></td>
                                                                <td className="p-4"><input type="text" value={stat.label} placeholder="Label" onChange={e => {
                                                                    const newStats = [...(editingSection.content.stats || [])];
                                                                    newStats[i].label = e.target.value;
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, stats: newStats } });
                                                                }} className="w-full bg-transparent outline-none font-medium text-slate-500" /></td>
                                                                <td className="p-4 text-right"><button onClick={() => {
                                                                    const newStats = editingSection.content.stats.filter((_: any, idx: number) => idx !== i);
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, stats: newStats } });
                                                                }} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button onClick={() => {
                                                    const newStats = [...(editingSection.content.stats || []), { value: "00%", label: "New Stat" }];
                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, stats: newStats } });
                                                }} className="w-full p-4 bg-slate-50 text-slate-500 hover:bg-slate-100 font-bold flex items-center justify-center gap-2 transition-all"><Plus size={16} /> 통계 추가</button>
                                            </div>
                                        </div>

                                        {/* CTAs */}
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Call to Action Buttons</label>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-slate-100">
                                                        {editingSection.content.ctas?.map((cta: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="p-4 w-1/2">
                                                                    <label className="text-[10px] text-slate-400 block mb-1">버튼 문구</label>
                                                                    <input type="text" value={cta.label} onChange={e => {
                                                                        const newCtas = [...editingSection.content.ctas];
                                                                        newCtas[i].label = e.target.value;
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, ctas: newCtas } });
                                                                    }} className="w-full bg-transparent outline-none font-bold text-slate-700" />
                                                                </td>
                                                                <td className="p-4">
                                                                    <label className="text-[10px] text-slate-400 block mb-1">액션 (Link/Estimator)</label>
                                                                    <select value={cta.actionType} onChange={e => {
                                                                        const newCtas = [...editingSection.content.ctas];
                                                                        newCtas[i].actionType = e.target.value;
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, ctas: newCtas } });
                                                                    }} className="w-full bg-transparent outline-none font-bold text-blue-600 text-xs">
                                                                        <option value="link">Link</option>
                                                                        <option value="openEstimator">Open Estimator</option>
                                                                        <option value="scroll">Scroll</option>
                                                                    </select>
                                                                </td>
                                                                <td className="p-4 text-right"><button onClick={() => {
                                                                    const newCtas = editingSection.content.ctas.filter((_: any, idx: number) => idx !== i);
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, ctas: newCtas } });
                                                                }} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button onClick={() => {
                                                    const newCtas = [...(editingSection.content.ctas || []), { label: "새 버튼", actionType: "openEstimator" }];
                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, ctas: newCtas } });
                                                }} className="w-full p-4 bg-slate-50 text-slate-500 hover:bg-slate-100 font-bold flex items-center justify-center gap-2 transition-all"><Plus size={16} /> 버튼 추가</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CONCEPT / REPORTING EDITOR */}
                                {['concept', 'reporting'].includes(editingSection.type) && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Title (줄바꿈: Enter)</label>
                                            <textarea value={editingSection.content.title || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none min-h-[80px]" />
                                        </div>
                                        {/* Style Options */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 크기</label>
                                                <select
                                                    value={editingSection.content.titleSize || 'lg'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게</option>
                                                    <option value="md">보통</option>
                                                    <option value="lg">크게 (기본)</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 색상</label>
                                                <select
                                                    value={editingSection.content.titleColor || 'slate'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleColor: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="white">흰색</option>
                                                    <option value="slate">검정 (기본)</option>
                                                    <option value="blue">파란색</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</label>
                                            <textarea value={editingSection.content.description || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, description: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none min-h-[100px]" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Main Image (Left/Bg)</label>
                                            <ImageUploader
                                                label="Upload Image"
                                                value={editingSection.content.image || ''}
                                                onChange={(url) => setEditingSection({ ...editingSection, content: { ...editingSection.content, image: url } })}
                                            />
                                        </div>

                                        {/* Right Card Editor (Concept Only) */}
                                        {editingSection.type === 'concept' && (
                                            <div className="space-y-6 pt-6 border-t border-slate-200">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="font-black text-slate-800">Right Side Card (Optional)</h4>
                                                    <button 
                                                        onClick={() => {
                                                            if (editingSection.content.card) {
                                                                // Remove card
                                                                const { card, ...rest } = editingSection.content;
                                                                setEditingSection({ ...editingSection, content: rest });
                                                            } else {
                                                                // Add card
                                                                setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { title: "Card Title", description: "Card Desc" } } });
                                                            }
                                                        }}
                                                        className={`px-3 py-1.5 rounded-lg font-bold text-xs ${editingSection.content.card ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}
                                                    >
                                                        {editingSection.content.card ? '카드 삭제' : '카드 추가'}
                                                    </button>
                                                </div>

                                                {editingSection.content.card && (
                                                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Card Title</label>
                                                            <input type="text" value={editingSection.content.card.title || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, title: e.target.value } } })} className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Card Image</label>
                                                            <ImageUploader
                                                                label="Card Image"
                                                                value={editingSection.content.card.image || ''}
                                                                onChange={(url) => setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, image: url } } })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Card Description</label>
                                                            <textarea value={editingSection.content.card.description || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, description: e.target.value } } })} className="w-full p-3 bg-slate-50 border-none rounded-xl font-medium text-slate-600 text-sm outline-none h-20 resize-none" />
                                                        </div>
                                                        
                                                        {/* Stats in Card */}
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Stats Grid (Max 4)</label>
                                                            <div className="grid gap-2">
                                                                {(editingSection.content.card.stats || []).map((stat: any, i: number) => (
                                                                    <div key={i} className="flex gap-2">
                                                                        <input type="text" placeholder="Label" value={stat.label} onChange={e => {
                                                                            const newStats = [...(editingSection.content.card.stats || [])];
                                                                            newStats[i].label = e.target.value;
                                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, stats: newStats } } });
                                                                        }} className="flex-1 p-2 bg-slate-50 rounded-lg text-xs font-medium" />
                                                                        <input type="text" placeholder="Value" value={stat.value} onChange={e => {
                                                                            const newStats = [...(editingSection.content.card.stats || [])];
                                                                            newStats[i].value = e.target.value;
                                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, stats: newStats } } });
                                                                        }} className="flex-1 p-2 bg-slate-50 rounded-lg text-xs font-bold" />
                                                                        <button onClick={() => {
                                                                            const newStats = editingSection.content.card.stats.filter((_: any, idx: number) => idx !== i);
                                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, stats: newStats } } });
                                                                        }} className="text-red-400"><Trash2 size={14} /></button>
                                                                    </div>
                                                                ))}
                                                                <button onClick={() => {
                                                                    const newStats = [...(editingSection.content.card.stats || []), { label: "Label", value: "Value" }];
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, stats: newStats } } });
                                                                }} className="p-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">+ Add Stat</button>
                                                            </div>
                                                        </div>

                                                        {/* CTA in Card */}
                                                        <div className="space-y-2 pt-2 border-t border-slate-100">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Card CTA Button</label>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (editingSection.content.card.cta) {
                                                                            const { cta, ...restCard } = editingSection.content.card;
                                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, card: restCard } });
                                                                        } else {
                                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, cta: { label: "Learn More", target: "#" } } } });
                                                                        }
                                                                    }}
                                                                    className="text-[10px] font-bold text-blue-500"
                                                                >
                                                                    {editingSection.content.card.cta ? 'Remove Btn' : 'Add Btn'}
                                                                </button>
                                                            </div>
                                                            {editingSection.content.card.cta && (
                                                                <div className="flex gap-2">
                                                                    <input type="text" placeholder="Button Text" value={editingSection.content.card.cta.label} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, cta: { ...editingSection.content.card.cta, label: e.target.value } } } })} className="flex-1 p-2 bg-slate-50 rounded-lg text-xs font-bold" />
                                                                    <input type="text" placeholder="Target URL" value={editingSection.content.card.cta.target} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, card: { ...editingSection.content.card, cta: { ...editingSection.content.card.cta, target: e.target.value } } } })} className="flex-1 p-2 bg-slate-50 rounded-lg text-xs font-medium" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* COMPARISON EDITOR */}
                                {editingSection.type === 'comparison' && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Section Title</label>
                                            <input type="text" value={editingSection.content.title || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {/* Left Side */}
                                            <div className="space-y-6 bg-white p-6 rounded-3xl border border-slate-200">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="bg-slate-100 text-slate-500 text-xs font-black px-2 py-1 rounded">LEFT</span>
                                                    <h4 className="font-bold text-slate-800">기존 방식 (비교군)</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Label (Small)</label>
                                                    <input type="text" value={editingSection.content.left?.label || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, left: { ...editingSection.content.left, label: e.target.value } } })} className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Image (Optional)</label>
                                                    <ImageUploader
                                                        label="Left Image"
                                                        value={editingSection.content.left?.image || ''}
                                                        onChange={(url) => setEditingSection({ ...editingSection, content: { ...editingSection.content, left: { ...editingSection.content.left, image: url } } })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Headline</label>
                                                    <input type="text" value={editingSection.content.left?.headline || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, left: { ...editingSection.content.left, headline: e.target.value } } })} className="w-full p-3 bg-slate-50 border-none rounded-xl font-black text-lg outline-none" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                                                    <textarea value={editingSection.content.left?.description || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, left: { ...editingSection.content.left, description: e.target.value } } })} className="w-full p-3 bg-slate-50 border-none rounded-xl font-medium text-slate-600 text-sm outline-none h-24 resize-none" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Points (Enter로 구분)</label>
                                                    <textarea 
                                                        value={editingSection.content.left?.points ? (Array.isArray(editingSection.content.left.points) ? editingSection.content.left.points.join('\n') : editingSection.content.left.points) : ''} 
                                                        onChange={e => {
                                                            const points = e.target.value.split('\n');
                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, left: { ...editingSection.content.left, points } } });
                                                        }} 
                                                        className="w-full p-3 bg-slate-50 border-none rounded-xl font-medium text-slate-600 text-sm outline-none h-32 resize-none" 
                                                        placeholder="한 줄에 하나씩 입력하세요"
                                                    />
                                                </div>
                                            </div>

                                            {/* Right Side */}
                                            <div className="space-y-6 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="bg-blue-100 text-blue-600 text-xs font-black px-2 py-1 rounded">RIGHT</span>
                                                    <h4 className="font-bold text-blue-900">Addressable TV (대조군)</h4>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-blue-400 uppercase">Label (Small)</label>
                                                    <input type="text" value={editingSection.content.right?.label || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, right: { ...editingSection.content.right, label: e.target.value } } })} className="w-full p-3 bg-white border border-blue-100 rounded-xl font-bold text-sm outline-none text-blue-600" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-blue-400 uppercase">Image (Optional)</label>
                                                    <ImageUploader
                                                        label="Right Image"
                                                        value={editingSection.content.right?.image || ''}
                                                        onChange={(url) => setEditingSection({ ...editingSection, content: { ...editingSection.content, right: { ...editingSection.content.right, image: url } } })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-blue-400 uppercase">Headline</label>
                                                    <input type="text" value={editingSection.content.right?.headline || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, right: { ...editingSection.content.right, headline: e.target.value } } })} className="w-full p-3 bg-white border border-blue-100 rounded-xl font-black text-lg outline-none text-blue-900" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-blue-400 uppercase">Description</label>
                                                    <textarea value={editingSection.content.right?.description || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, right: { ...editingSection.content.right, description: e.target.value } } })} className="w-full p-3 bg-white border border-blue-100 rounded-xl font-medium text-slate-600 text-sm outline-none h-24 resize-none" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-blue-400 uppercase">Points (Enter로 구분)</label>
                                                    <textarea 
                                                        value={editingSection.content.right?.points ? (Array.isArray(editingSection.content.right.points) ? editingSection.content.right.points.join('\n') : editingSection.content.right.points) : ''} 
                                                        onChange={e => {
                                                            const points = e.target.value.split('\n');
                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, right: { ...editingSection.content.right, points } } });
                                                        }} 
                                                        className="w-full p-3 bg-white border border-blue-100 rounded-xl font-medium text-slate-600 text-sm outline-none h-32 resize-none" 
                                                        placeholder="한 줄에 하나씩 입력하세요"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* GENERIC REPEATER EDITOR (ValueProps, HowItWorks, UseCases, Why, FAQ, ImageCards) */}
                                {['valueProps', 'howItWorks', 'useCases', 'why', 'faq', 'imageCards'].includes(editingSection.type) && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Section Title (줄바꿈: Enter)</label>
                                            <textarea value={editingSection.content.title || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none min-h-[80px]" />
                                        </div>
                                        {/* Style Options */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 크기</label>
                                                <select
                                                    value={editingSection.content.titleSize || 'lg'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게</option>
                                                    <option value="md">보통</option>
                                                    <option value="lg">크게 (기본)</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 색상</label>
                                                <select
                                                    value={editingSection.content.titleColor || 'slate'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleColor: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="white">흰색</option>
                                                    <option value="slate">검정 (기본)</option>
                                                    <option value="blue">파란색</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Description/Subtitle for sections that have it */}
                                        {['why', 'useCases', 'howItWorks', 'imageCards'].includes(editingSection.type) && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                    {editingSection.type === 'why' ? 'Description' : 'Subtitle'}
                                                </label>
                                                <textarea
                                                    value={editingSection.content.description || editingSection.content.subtitle || ''}
                                                    onChange={e => {
                                                        const fieldName = (editingSection.type === 'why' || editingSection.type === 'imageCards' && editingSection.content.description !== undefined) ? 'description' : 'subtitle';
                                                        // For imageCards, prefer subtitle but handle description if it exists
                                                        const targetField = (editingSection.type === 'imageCards') ? 'subtitle' : fieldName;
                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [targetField]: e.target.value } });
                                                    }}
                                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:border-blue-500 outline-none min-h-[100px]"
                                                    placeholder="섹션 설명을 입력하세요..."
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Items / Cards / Steps</label>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 border-b">
                                                        <tr>
                                                            <th className="p-4 text-left text-slate-400 font-black text-[10px] uppercase">Content</th>
                                                            {(editingSection.type === 'howItWorks' || editingSection.type === 'useCases' || editingSection.type === 'imageCards') && <th className="p-4 text-left text-slate-400 font-black text-[10px] uppercase w-40">Image</th>}
                                                            <th className="p-4 w-20"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(editingSection.content.cards || editingSection.content.questions || editingSection.content.steps || editingSection.content.cases || []).map((item: any, i: number) => (
                                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="p-6 space-y-3">
                                                                    {editingSection.type === 'useCases' && (
                                                                        <input type="text" value={item.tag || ''} onChange={e => {
                                                                            const newList = [...editingSection.content.cases];
                                                                            newList[i].tag = e.target.value;
                                                                            setEditingSection({ ...editingSection, content: { ...editingSection.content, cases: newList } });
                                                                        }} className="w-1/2 bg-blue-50/50 p-2 rounded-lg text-xs font-bold text-blue-600 outline-none" placeholder="Tag..." />
                                                                    )}
                                                                    <input type="text" value={item.title || item.question || (item.step !== undefined ? item.step + '. ' + (item.title || '') : (item.title || ''))} onChange={e => {
                                                                        // Logic to update correct field based on type
                                                                        const listName = editingSection.type === 'faq' ? 'questions' : (editingSection.type === 'howItWorks' ? 'steps' : (editingSection.type === 'useCases' ? 'cases' : 'cards'));
                                                                        const key = editingSection.type === 'faq' ? 'question' : 'title';
                                                                        const newList = [...editingSection.content[listName]];
                                                                        newList[i][key] = e.target.value;
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                    }} className="w-full bg-transparent outline-none font-black text-lg text-slate-800" placeholder="Title..." />

                                                                    <textarea value={item.description || item.answer} onChange={e => {
                                                                        const listName = editingSection.type === 'faq' ? 'questions' : (editingSection.type === 'howItWorks' ? 'steps' : (editingSection.type === 'useCases' ? 'cases' : 'cards'));
                                                                        const key = editingSection.type === 'faq' ? 'answer' : 'description';
                                                                        const newList = [...editingSection.content[listName]];
                                                                        newList[i][key] = e.target.value;
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                    }} className="w-full bg-transparent outline-none text-slate-500 leading-relaxed text-sm resize-none" rows={2} placeholder="Content description..." />
                                                                </td>
                                                                {(editingSection.type === 'howItWorks' || editingSection.type === 'useCases' || editingSection.type === 'imageCards') && (
                                                                    <td className="p-6 align-top">
                                                                        <ImageUploader
                                                                            label="Img"
                                                                            value={item.image || ''}
                                                                            onChange={(url) => {
                                                                                const listName = editingSection.type === 'howItWorks' ? 'steps' : (editingSection.type === 'useCases' ? 'cases' : 'cards');
                                                                                const newList = [...editingSection.content[listName]];
                                                                                newList[i].image = url;
                                                                                setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                            }}
                                                                        />
                                                                    </td>
                                                                )}
                                                                <td className="p-6 text-right">
                                                                    <button onClick={() => {
                                                                        const listName = editingSection.type === 'faq' ? 'questions' : (editingSection.type === 'howItWorks' ? 'steps' : (editingSection.type === 'useCases' ? 'cases' : 'cards'));
                                                                        const newList = editingSection.content[listName].filter((_: any, idx: number) => idx !== i);
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                    }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button onClick={() => {
                                                    const listName = editingSection.type === 'faq' ? 'questions' : (editingSection.type === 'howItWorks' ? 'steps' : (editingSection.type === 'useCases' ? 'cases' : 'cards'));
                                                    const newItem = editingSection.type === 'faq' ? { question: "New Q", answer: "" } :
                                                        editingSection.type === 'useCases' ? { tag: "New Tag", title: "New Case", description: "" } :
                                                            { title: "New Item", description: "", image: "" };
                                                    const newList = [...(editingSection.content[listName] || []), newItem];
                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                }} className="w-full p-6 bg-slate-50 text-blue-600 hover:bg-blue-50 font-black text-sm flex items-center justify-center gap-2 transition-all border-t"><Plus size={18} /> 항목 추가하기</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ESTIMATE GUIDE EDITOR */}
                                {editingSection.type === 'estimateGuide' && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Guide Title</label>
                                            <input type="text" value={editingSection.content.title || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtitle (Description)</label>
                                            <textarea value={editingSection.content.subtitle || ''} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitle: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-medium focus:border-blue-500 outline-none min-h-[80px]" placeholder="부제목을 입력하세요 (줄바꿈 가능)" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Steps (단계별 설명)</label>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                <div className="divide-y divide-slate-100">
                                                    {(editingSection.content.steps || []).map((step: string, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                                                            <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">{i + 1}</span>
                                                            <input 
                                                                type="text" 
                                                                value={step} 
                                                                onChange={e => {
                                                                    const newSteps = [...editingSection.content.steps];
                                                                    newSteps[i] = e.target.value;
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, steps: newSteps } });
                                                                }} 
                                                                className="flex-1 bg-transparent outline-none font-medium text-slate-700"
                                                            />
                                                            <button onClick={() => {
                                                                const newSteps = editingSection.content.steps.filter((_: any, idx: number) => idx !== i);
                                                                setEditingSection({ ...editingSection, content: { ...editingSection.content, steps: newSteps } });
                                                            }} className="text-red-300 hover:text-red-500"><Trash2 size={16} /></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={() => {
                                                    const newSteps = [...(editingSection.content.steps || []), "새로운 단계 설명"];
                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, steps: newSteps } });
                                                }} className="w-full p-4 bg-slate-50 text-blue-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"><Plus size={16} /> 단계 추가</button>
                                            </div>
                                        </div>
                                        {/* Style Options */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 크기</label>
                                                <select
                                                    value={editingSection.content.titleSize || 'lg'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게</option>
                                                    <option value="md">보통</option>
                                                    <option value="lg">크게 (기본)</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">제목 색상</label>
                                                <select
                                                    value={editingSection.content.titleColor || 'slate'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, titleColor: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="white">흰색</option>
                                                    <option value="slate">검정 (기본)</option>
                                                    <option value="blue">파란색</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">부제목 크기</label>
                                                <select
                                                    value={editingSection.content.subtitleSize || 'md'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitleSize: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="sm">작게</option>
                                                    <option value="md">보통 (기본)</option>
                                                    <option value="lg">크게</option>
                                                    <option value="xl">매우 크게</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">부제목 색상</label>
                                                <select
                                                    value={editingSection.content.subtitleColor || 'slate'}
                                                    onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitleColor: e.target.value } })}
                                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:border-blue-500 outline-none"
                                                >
                                                    <option value="slate">회색 (기본)</option>
                                                    <option value="blue">파란색</option>
                                                    <option value="green">초록색</option>
                                                    <option value="purple">보라색</option>
                                                    <option value="orange">주황색</option>
                                                    <option value="red">빨간색</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="p-10 border-t bg-white flex justify-between items-center">
                                <p className="text-xs text-slate-400 font-bold italic flex items-center gap-2"><Check size={14} className="text-green-500" /> 모든 변경사항은 Vercel KV에 즉시 저장됩니다.</p>
                                <div className="flex gap-4">
                                    <button onClick={() => setEditingSection(null)} className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-black transition-all">취소</button>
                                    <button onClick={saveSectionContent} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2">
                                        <Save size={20} /> 저장 및 반영하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Add Section */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-10 space-y-8">
                            <div className="text-center">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">새 섹션 추가</h3>
                                <p className="text-slate-500 mt-2 font-medium">추가할 섹션 유형을 선택하세요.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'valueProps', label: 'Value Props (카드형)', icon: Layout },
                                    { id: 'howItWorks', label: 'How It Works (단계별)', icon: Move },
                                    { id: 'imageCards', label: 'Image Cards (이미지 카드)', icon: ImageIcon },
                                    { id: 'reporting', label: 'Reporting (리포트 강조)', icon: BarChart3 },
                                    { id: 'faq', label: 'FAQ (질의응답)', icon: Database },
                                    { id: 'estimateGuide', label: 'Estimate Guide (견적안내)', icon: ShieldCheck },
                                ].map(type => (
                                    <button key={type.id} onClick={() => addSection(type.id)} className="flex items-center gap-4 p-5 border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group">
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                                            <type.icon size={20} />
                                        </div>
                                        <span className="font-bold text-slate-700 group-hover:text-blue-900">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-full py-4 text-slate-400 font-bold hover:text-slate-600">닫기</button>
                        </div>
                    </div>
                )}

                {/* Advance Mode: Raw JSON Editor (for emergency) */}
                {jsonEditor && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-10 z-[60] animate-in fade-in duration-300">
                        <div className="bg-slate-900 w-full max-w-4xl h-full rounded-3xl overflow-hidden flex flex-col border border-white/10">
                            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                                <h3 className="text-white font-black">Raw JSON Editor - {jsonEditor.id}</h3>
                                <button onClick={() => setJsonEditor(null)} className="text-slate-500 hover:text-white">✕</button>
                            </div>
                            <textarea value={jsonEditor.content} onChange={e => setJsonEditor({ ...jsonEditor, content: e.target.value })} className="flex-1 p-10 bg-black text-green-400 font-mono text-sm outline-none resize-none" spellCheck={false} />
                            <div className="p-6 bg-slate-800 flex justify-end gap-4">
                                <button onClick={() => setJsonEditor(null)} className="text-slate-400 px-6 py-2 font-bold">Cancel</button>
                                <button onClick={saveJsonContent} className="bg-green-600 text-white px-8 py-2 rounded-xl font-black shadow-lg">Overwrite JSON</button>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="mt-auto border-t py-10 px-8 flex justify-end items-center text-slate-400 font-medium">
                    <div className="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="text-blue-500">System v3.0</span>
                        <span>Authorized Access Only</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}// Forced update to trigger rebuild
