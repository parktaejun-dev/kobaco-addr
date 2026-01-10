'use client';

import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SalesLayoutProps {
    children: ReactNode;
}

export default function SalesLayout({ children }: SalesLayoutProps) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = [
        { href: '/sales', label: '대시보드', icon: '📊' },
        { href: '/sales/settings', label: '설정', icon: '⚙️' },
    ];

    const isActive = (href: string) => {
        if (href === '/sales') return pathname === '/sales';
        return pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Bar */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-[60]">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Link href="/sales" className="ml-3 font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <span>KOBACO Sniper</span>
                </Link>
            </div>

            {/* Content Wrapper */}
            <div className="flex-1 flex pt-14 h-screen overflow-hidden">
                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`
            fixed top-14 left-0 bottom-0 w-64 bg-slate-50 border-r border-gray-200 flex flex-col z-50
            transform transition-transform duration-300 ease-in-out shadow-xl
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
                >
                    {/* Navigation */}
                    <nav className="flex-1 p-3 space-y-1">
                        {navItems.map((item) => {
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${active
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}
                  `}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 bg-white/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                S
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-900 truncate">Sales Rep</div>
                                <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">Authorized</div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-h-0 bg-gray-50 relative overflow-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
