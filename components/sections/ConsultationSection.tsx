"use client";

import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

interface ConsultationSectionProps {
    data: {
        title: string;
        titleSize?: string;
        titleColor?: string;
        subtitle?: string;
        description?: string;
        webhookUrl?: string;
        successMessage?: string;
        contactPhone?: string;
        contactEmail?: string;
        showContactPhone?: boolean;
        showContactEmail?: boolean;
        fields?: {
            name?: boolean;
            email?: boolean;
            company?: boolean;
            position?: boolean;
            message?: boolean;
        };
    };
}

export default function ConsultationSection({ data }: ConsultationSectionProps) {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        position: '',
        phone: '',
        email: '',
        message: ''
    });

    if (!data) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('/api/consultation/submit', {
                ...formData,
                webhookUrl: data.webhookUrl
            });
            setSuccess(true);
            toast.success('상담 요청이 성공적으로 접수되었습니다.');
        } catch (error) {
            toast.error('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Style Mappings (Reused from other sections)
    const titleSizeClasses: Record<string, string> = {
        sm: 'text-2xl sm:text-3xl',
        md: 'text-3xl sm:text-4xl',
        lg: 'text-4xl sm:text-5xl',
        xl: 'text-5xl sm:text-6xl',
    };
    const colorClasses: Record<string, string> = {
        white: 'text-white',
        slate: 'text-slate-900',
        blue: 'text-blue-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
        orange: 'text-orange-600',
        red: 'text-red-600',
    };

    const titleSizeClass = titleSizeClasses[data.titleSize || 'md'];
    const titleColorClass = data.titleColor === 'slate' ? 'text-slate-900' : colorClasses[data.titleColor || 'slate'];

    return (
        <section className="section-pad bg-white relative overflow-hidden" id="consultation">
            {/* Decorational Background */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 -skew-x-12 translate-x-1/4 z-0 pointer-events-none" />

            <div className="section-wrap relative z-10 max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
                {/* Left Content */}
                <div className="flex-1 space-y-6">
                    <div>
                        <span className="text-blue-600 font-black tracking-widest text-sm uppercase mb-3 block">Contact Us</span>
                        <h2 className={`${titleSizeClass} ${titleColorClass} font-black tracking-tight leading-tight mb-6`}>
                            {data.title.split('\n').map((line, i) => (
                                <span key={i}>{line}<br /></span>
                            ))}
                        </h2>
                        {data.subtitle && (
                            <p className="text-xl text-slate-500 font-medium leading-relaxed text-balance">
                                {data.subtitle}
                            </p>
                        )}
                    </div>

                    {data.description && (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 leading-relaxed">
                            {data.description}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        {(data.showContactPhone !== false) && (
                            <div className="flex-1 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <div className="font-bold text-blue-900 mb-1">고객센터</div>
                                <div className="text-sm text-blue-700">{data.contactPhone || '02-731-XXXX'}</div>
                            </div>
                        )}
                        {(data.showContactEmail !== false) && (
                            <div className="flex-1 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="font-bold text-slate-900 mb-1">이메일</div>
                                <div className="text-sm text-slate-600">{data.contactEmail || 'help@kobaco.co.kr'}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Form */}
                <div className="w-full lg:w-[500px] bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10">
                    {success ? (
                        <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900">요청이 접수되었습니다!</h3>
                            <p className="text-slate-500 max-w-xs mx-auto">
                                {data.successMessage}
                            </p>
                            <button
                                onClick={() => { setSuccess(false); setFormData({ ...formData, message: '' }); }}
                                className="mt-8 text-blue-600 font-bold hover:underline"
                            >
                                추가 문의하기
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {(data.fields?.name !== false) && (
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">담당자명 *</label>
                                        <input
                                            type="text"
                                            name="name"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                            placeholder="홍길동"
                                        />
                                    </div>
                                )}
                                {(data.fields?.email !== false) && (
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">이메일 *</label>
                                        <input
                                            type="email"
                                            name="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                            placeholder="user@example.com"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(data.fields?.company !== false) && (
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">회사명 *</label>
                                        <input
                                            type="text"
                                            name="company"
                                            required
                                            value={formData.company}
                                            onChange={handleChange}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                            placeholder="코바코"
                                        />
                                    </div>
                                )}
                                {(data.fields?.position !== false) && (
                                    <div className="space-y-1">
                                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">직책</label>
                                        <input
                                            type="text"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleChange}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                                            placeholder="마케팅 팀장"
                                        />
                                    </div>
                                )}
                            </div>

                            {(data.fields?.message !== false) && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">문의 내용 (선택)</label>
                                    <textarea
                                        name="message"
                                        rows={2}
                                        value={formData.message}
                                        onChange={handleChange}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all resize-none"
                                        placeholder="궁금한 점이 있으시면 남겨주세요."
                                    ></textarea>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-black text-base shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                상담 신청하기
                            </button>
                            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                                개인정보는 상담 목적으로만 활용됩니다.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </section>
    );
}
