"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Lock, Layout, ShieldCheck, Database, BarChart3,
    Edit, Trash2, Plus, ChevronDown, Check, X,
    Eye, Save, Settings, Move, GripVertical
} from 'lucide-react';

type Tab = 'home' | 'content' | 'policies' | 'segments' | 'usage';

export default function AdminPortal() {
    // Middleware handles authentication - if we reach this page, we're already authenticated
    const [activeTab, setActiveTab] = useState<Tab>('home');

    // Data State
    const [homeConfig, setHomeConfig] = useState<any>(null);
    const [policies, setPolicies] = useState<{ channels: any[], bonuses: any[], surcharges: any[] }>({ channels: [], bonuses: [], surcharges: [] });
    const [segments, setSegments] = useState<any[]>([]);
    const [usageLogs, setUsageLogs] = useState<any[]>([]);

    // Editor State
    const [editingSection, setEditingSection] = useState<{ id: string, type: string, content: any } | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [jsonEditor, setJsonEditor] = useState<{ id: string, content: string } | null>(null);

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
            if (activeTab === 'content') {
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
                // segments.json has { version, data: [] } structure
                const segmentData = res.data.data || res.data;
                setSegments(segmentData);
            } else if (activeTab === 'usage') {
                const res = await axios.get('/api/log/usage');
                setUsageLogs(res.data);
            }
        } catch (e) {
            toast.error("Failed to load data");
        }
    };

    // Login handled by Middleware (HTTP Basic Auth)

    // --- Content Builder Handlers ---

    const updateSectionOrder = async (newList: any[]) => {
        const newConfig = { ...homeConfig, sections: newList };
        setHomeConfig(newConfig);
        try {
            await axios.post('/api/admin/content', { action: 'save_home', content: newConfig });
            toast.success("순서가 저장되었습니다.");
        } catch (e) {
            toast.error("순서 저장 실패");
        }
    };

    const toggleSection = async (id: string, current: boolean) => {
        const newSections = homeConfig.sections.map((s: any) =>
            s.id === id ? { ...s, enabled: !current } : s
        );
        const newConfig = { ...homeConfig, sections: newSections };
        setHomeConfig(newConfig);
        await axios.post('/api/admin/content', { action: 'save_home', content: newConfig });
    };

    const addSection = async (type: string) => {
        try {
            const res = await axios.post('/api/admin/content', { action: 'create_section', type });
            toast.success(`Section ${res.data.id} created!`);
            setShowAddModal(false);
            loadTabData();
        } catch (e) {
            toast.error("Failed to add section");
        }
    };

    const deleteSection = async (id: string) => {
        if (!window.confirm("정말 이 섹션을 삭제하시겠습니까? (비활성화 처리됩니다)")) return;
        await toggleSection(id, true); // Set to disabled
        toast.info("Section disabled (soft delete)");
    };

    const openEditor = async (section: any) => {
        const res = await axios.get(`/api/admin/content?type=section&id=${section.id}`);
        setEditingSection({ ...section, content: res.data });
    };

    const saveSectionContent = async () => {
        if (!editingSection) return;
        try {
            await axios.post('/api/admin/content', {
                action: 'save_section',
                id: editingSection.id,
                content: editingSection.content
            });
            toast.success("Changes saved!");
            setEditingSection(null);
        } catch (e) {
            toast.error("Save failed");
        }
    };

    // --- Policy Handlers (Simple Edit) ---
    const savePolicyEdit = async (type: 'channels' | 'bonuses' | 'surcharges' | 'segments', newList: any[]) => {
        try {
            await axios.post('/api/admin/policy', { type, data: newList });
            toast.success("Saved to JSON");
            loadTabData();
        } catch (e) {
            toast.error("Save failed");
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
        } catch (e) {
            toast.error("JSON 형식 오류 또는 저장 실패");
        }
    };

    // --- Render Helpers ---

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 shadow-2xl z-20">
                <button
                    onClick={() => setActiveTab('home')}
                    className="p-8 border-b border-white/10 text-left hover:bg-white/5 transition-all group"
                >
                    <h2 className="text-xl font-black tracking-tighter text-blue-400 group-hover:text-blue-300">KOBACO Addressable</h2>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">관리자 페이지</p>
                </button>
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    {[
                        { id: 'content', label: '섹션 관리', icon: Layout },
                        { id: 'policies', label: '정책 관리', icon: ShieldCheck },
                        { id: 'segments', label: '세그먼트 DB', icon: Database },
                        { id: 'usage', label: '사용 기록', icon: BarChart3 },
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                            <item.icon size={18} /> {item.label}
                        </button>
                    ))}
                </nav>
                <div className="p-6 border-t border-white/10 flex flex-col gap-4">
                    <a href="/" target="_blank" className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold"><Eye size={12} /> 미리보기 (Home)</a>
                    <button onClick={() => { sessionStorage.removeItem('admin_access'); window.location.reload(); }} className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-2 font-bold"><X size={12} /> 로그아웃</button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 ml-64 p-12 flex flex-col min-h-screen">
                {activeTab !== 'home' && (
                    <header className="mb-12">
                        <h1 className="text-4xl font-black text-slate-900 capitalize tracking-tight">
                            {activeTab === 'content' ? '섹션 관리' : activeTab === 'policies' ? '정책 관리' : activeTab === 'segments' ? '세그먼트 DB' : '사용 기록'}
                        </h1>
                    </header>
                )}

                {/* Tab: Home (Dashboard) */}
                {activeTab === 'home' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <header>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">안녕하세요, 관리자님</h1>
                            <p className="text-slate-500 mt-2 font-medium">KOBACO Addressable의 모든 설정과 데이터를 한눈에 관리하세요.</p>
                        </header>

                        <div className="grid grid-cols-2 gap-6">
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
                                                                            section.id === 'estimateGuide' ? '견적 가이드' : section.id
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
                                            <table className="w-full text-xs">
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
                                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors group text-[11px]">
                                                                <td className="p-3"><input type="text" value={bo.bonus_type} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].bonus_type = e.target.value;
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none font-bold text-slate-700 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                                <td className="p-3 text-slate-400 italic font-mono px-4">{bo.condition_type}</td>
                                                                <td className="p-3"><input type="number" value={bo.min_value} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].min_value = parseFloat(e.target.value);
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none text-right font-medium focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                                <td className="p-3"><input type="number" step="0.01" value={bo.rate} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].rate = parseFloat(e.target.value);
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none text-right font-black text-green-600 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                                <td className="p-3"><input type="text" value={bo.description} onChange={e => {
                                                                    const newList = [...policies.bonuses];
                                                                    newList[i].description = e.target.value;
                                                                    setPolicies({ ...policies, bonuses: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none text-slate-500 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
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
                                            <table className="w-full text-xs">
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
                                                                }} className="w-full bg-transparent p-1.5 outline-none font-bold text-slate-700 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                                <td className="p-3"><input type="text" value={sc.condition_value} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].condition_value = e.target.value;
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none font-medium text-slate-700 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                                <td className="p-3"><input type="number" step="0.01" value={sc.rate} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].rate = parseFloat(e.target.value);
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none text-right font-black text-orange-600 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
                                                                <td className="p-3"><input type="text" value={sc.description} onChange={e => {
                                                                    const newList = [...policies.surcharges];
                                                                    newList[i].description = e.target.value;
                                                                    setPolicies({ ...policies, surcharges: newList });
                                                                }} className="w-full bg-transparent p-1.5 outline-none text-slate-500 focus:bg-white rounded border border-transparent focus:border-slate-200" /></td>
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
                                        <tr className="text-slate-400 font-black text-[10px] uppercase tracking-widest">
                                            <th className="p-6 text-left w-40">대분류</th>
                                            <th className="p-6 text-left w-40">중분류</th>
                                            <th className="p-6 text-left">세그먼트명</th>
                                            <th className="p-6 text-left">설명</th>
                                            <th className="p-6 text-left">추천 광고주</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredSegments.slice(0, 100).map((seg, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6">
                                                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{seg['대분류']}</span>
                                                </td>
                                                <td className="p-6 font-bold text-slate-600">{seg['중분류']}</td>
                                                <td className="p-6 font-black text-slate-900">{seg.name}</td>
                                                <td className="p-6 text-slate-500 leading-relaxed text-xs">{seg.description}</td>
                                                <td className="p-6 text-slate-400 text-xs italic">{seg.recommended_advertisers}</td>
                                            </tr>
                                        ))}
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
                                                    editingSection.id === 'howItWorks' ? '작동 방식' :
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
                                                <input type="text" value={editingSection.content.eyebrow} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, eyebrow: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Title</label>
                                                <input type="text" value={editingSection.content.title} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtitle</label>
                                            <textarea value={editingSection.content.subtitle} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, subtitle: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none transition-all min-h-[100px]" />
                                        </div>
                                        {/* KPIs Table */}
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">KPI Badges</label>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-slate-100">
                                                        {editingSection.content.kpis?.map((kpi: any, i: number) => (
                                                            <tr key={i}>
                                                                <td className="p-4"><input type="text" value={kpi.label} onChange={e => {
                                                                    const newKpis = [...editingSection.content.kpis];
                                                                    newKpis[i].label = e.target.value;
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, kpis: newKpis } });
                                                                }} className="w-full bg-transparent outline-none font-bold text-slate-700" /></td>
                                                                <td className="p-4 text-right"><button onClick={() => {
                                                                    const newKpis = editingSection.content.kpis.filter((_: any, idx: number) => idx !== i);
                                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, kpis: newKpis } });
                                                                }} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button onClick={() => {
                                                    const newKpis = [...(editingSection.content.kpis || []), { label: "New KPI" }];
                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, kpis: newKpis } });
                                                }} className="w-full p-4 bg-slate-50 text-slate-500 hover:bg-slate-100 font-bold flex items-center justify-center gap-2 transition-all"><Plus size={16} /> KPI 추가</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* VALUE PROPS / FAQ EDITOR (Table Based) */}
                                {(editingSection.type === 'valueProps' || editingSection.type === 'faq') && (
                                    <div className="space-y-8">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Section Title</label>
                                            <input type="text" value={editingSection.content.title} onChange={e => setEditingSection({ ...editingSection, content: { ...editingSection.content, title: e.target.value } })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:border-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{editingSection.type === 'faq' ? 'Questions & Answers' : 'Feature Cards'}</label>
                                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-slate-50 border-b">
                                                        <tr>
                                                            <th className="p-4 text-left text-slate-400 font-black text-[10px] uppercase">Content</th>
                                                            <th className="p-4 w-20"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {(editingSection.content.cards || editingSection.content.questions || []).map((item: any, i: number) => (
                                                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="p-6 space-y-3">
                                                                    <input type="text" value={item.title || item.question} onChange={e => {
                                                                        const listName = editingSection.type === 'faq' ? 'questions' : 'cards';
                                                                        const key = editingSection.type === 'faq' ? 'question' : 'title';
                                                                        const newList = [...editingSection.content[listName]];
                                                                        newList[i][key] = e.target.value;
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                    }} className="w-full bg-transparent outline-none font-black text-lg text-slate-800" placeholder="Title..." />
                                                                    <textarea value={item.description || item.answer} onChange={e => {
                                                                        const listName = editingSection.type === 'faq' ? 'questions' : 'cards';
                                                                        const key = editingSection.type === 'faq' ? 'answer' : 'description';
                                                                        const newList = [...editingSection.content[listName]];
                                                                        newList[i][key] = e.target.value;
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                    }} className="w-full bg-transparent outline-none text-slate-500 leading-relaxed text-sm resize-none" rows={2} placeholder="Content description..." />
                                                                </td>
                                                                <td className="p-6 text-right">
                                                                    <button onClick={() => {
                                                                        const listName = editingSection.type === 'faq' ? 'questions' : 'cards';
                                                                        const newList = editingSection.content[listName].filter((_: any, idx: number) => idx !== i);
                                                                        setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                                    }} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button onClick={() => {
                                                    const listName = editingSection.type === 'faq' ? 'questions' : 'cards';
                                                    const newItem = editingSection.type === 'faq' ? { question: "New Question", answer: "" } : { title: "New Feature", description: "" };
                                                    const newList = [...(editingSection.content[listName] || []), newItem];
                                                    setEditingSection({ ...editingSection, content: { ...editingSection.content, [listName]: newList } });
                                                }} className="w-full p-6 bg-slate-50 text-blue-600 hover:bg-blue-50 font-black text-sm flex items-center justify-center gap-2 transition-all border-t"><Plus size={18} /> 항목 추가하기</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* OTHER TYPES fallback */}
                                {['reporting', 'estimateGuide'].includes(editingSection.type) && (
                                    <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                        <Database size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400 font-bold">이 섹션 타입({editingSection.type})은 현재 JSON 고급 편집만 지원하거나 곧 폼이 추가될 예정입니다.</p>
                                        <button onClick={() => setJsonEditor({ id: editingSection.id, content: JSON.stringify(editingSection.content, null, 2) })} className="mt-4 text-blue-600 font-black hover:underline">JSON 수동 편집하기</button>
                                    </div>
                                )}
                            </div>

                            <div className="p-10 border-t bg-white flex justify-between items-center">
                                <p className="text-xs text-slate-400 font-bold italic flex items-center gap-2"><Check size={14} className="text-green-500" /> 데이터가 로컬 JSON 파일에 직접 저장됩니다.</p>
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

                <footer className="mt-auto border-t py-10 px-8 flex justify-between items-center text-slate-400 font-medium">
                    <p className="text-sm tracking-tight">&copy; 2024 KOBACO Addressable TV. All Rights Reserved.</p>
                    <div className="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="text-blue-500">System v3.0</span>
                        <span>Authorized Access Only</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}// Forced update to trigger rebuild
