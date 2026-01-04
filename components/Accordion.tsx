// components/Accordion.tsx
'use client';

import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionSectionProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    disabled?: boolean;
    icon?: ReactNode;
}

export function AccordionSection({
    title,
    children,
    defaultOpen = false,
    disabled = false,
    icon,
}: AccordionSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border rounded-xl mb-4 overflow-hidden transition-all ${disabled ? 'opacity-50' : ''
            }`}>
            <button
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full px-6 py-4 flex items-center justify-between text-left transition-colors ${isOpen ? 'bg-blue-50 border-b' : 'bg-white hover:bg-gray-50'
                    } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <div className="flex items-center gap-3">
                    {icon && <span className="text-blue-600">{icon}</span>}
                    <span className="font-bold text-gray-900">{title}</span>
                </div>
                <ChevronDown
                    size={20}
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                        }`}
                />
            </button>
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
            >
                <div className="p-6 bg-white">{children}</div>
            </div>
        </div>
    );
}
