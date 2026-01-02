"use client";
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setIsVisible(true);
        document.body.style.overflow = 'hidden';
    } else {
        const timer = setTimeout(() => setIsVisible(false), 300);
        document.body.style.overflow = 'unset';
        return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300",
        isOpen ? "opacity-100" : "opacity-0"
    )}>
      <div
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={clsx(
          "relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transform transition-all duration-300",
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
      )}>
        {/* Header inside modal content if needed, but EstimationFlow has its own header */}
        {/* We can provide a minimal close button here as backup or for consistency if title is used */}
        {title && (
             <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
        )}

        <div className="p-6">
            {children}
        </div>
      </div>
    </div>
  );
}
