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
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-50">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span className="ml-3 font-bold text-gray-900">KOBACO Sniper</span>
            </div>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed md:sticky top-0 left-0 h-screen w-64 bg-slate-50 border-r border-gray-200 flex flex-col z-50
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
            >
                {/* Header */}
                <div className="h-14 flex items-center px-4 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        <span className="font-bold text-gray-900">KOBACO Sniper</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive(item.href)
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}
              `}
                        >
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                            S
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">Sales Rep</div>
                            <div className="text-xs text-gray-500">KOBACO</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-0 pt-14 md:pt-0 min-h-screen overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
