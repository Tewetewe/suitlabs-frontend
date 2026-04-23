'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface SimpleModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Wider for data-heavy modals */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional footer area (buttons) */
  footer?: React.ReactNode;
}

const sizeClass = {
  sm:  'max-w-sm',
  md:  'max-w-xl',
  lg:  'max-w-3xl',
  xl:  'max-w-5xl',
};

export default function SimpleModal({ isOpen, title, onClose, children, size = 'lg', footer }: SimpleModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4 animate-fade-in"
      aria-modal
      role="dialog"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35 backdrop-blur-md" onClick={onClose} />

      {/* Panel */}
      <div
        className={clsx(
          'relative z-10 w-full glass-panel-strong flex flex-col',
          // Mobile: bottom sheet
          'max-h-[88vh] rounded-t-2xl rounded-b-none animate-slide-up',
          // Tablet/desktop: centered modal
          'md:max-h-[90vh] md:rounded-2xl md:rounded-b-2xl',
          sizeClass[size]
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3 md:px-5 md:py-4">
          <h3 className="text-base font-semibold text-slate-900 truncate tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/50 hover:text-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-black/5 bg-white/35 px-4 py-3 md:px-5 flex justify-end gap-2 md:rounded-b-2xl backdrop-blur-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}


