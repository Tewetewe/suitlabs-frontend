'use client';

import React, { useEffect, useRef } from 'react';
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
  /** Keep dropdowns visible instead of clipping them */
  overflowVisible?: boolean;
  /** Stack above another open modal */
  nested?: boolean;
}

const sizeClass = {
  sm:  'max-w-sm',
  md:  'max-w-xl',
  lg:  'max-w-3xl',
  xl:  'max-w-5xl',
};

export default function SimpleModal({ isOpen, title, onClose, children, size = 'lg', footer, overflowVisible = false, nested = false }: SimpleModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) bodyRef.current?.scrollTo({ top: 0 });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={clsx(
        'vv-screen flex items-end justify-center p-0 md:items-center md:p-4 animate-fade-in',
        nested ? 'z-[70]' : 'z-50',
      )}
      aria-modal
      role="dialog"
    >
      <div className="absolute inset-0 bg-white/90 backdrop-blur-md" onClick={onClose} />

      <div
        className={clsx(
          'relative z-10 flex w-full min-h-0 flex-col glass-panel-strong',
          'max-h-full rounded-t-2xl rounded-b-none animate-slide-up',
          'md:max-h-[min(90dvh,100%)] md:rounded-2xl',
          sizeClass[size]
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3 md:px-5 md:py-4">
          <h3 className="text-base font-semibold text-slate-900 truncate tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-white/50 hover:text-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={bodyRef}
          className={clsx(
            'min-h-0 flex-1 px-4 py-4 md:px-5 md:py-5',
            overflowVisible ? 'overflow-visible' : 'overflow-y-auto scroll-pad-keyboard',
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-black/5 bg-white/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5 flex flex-wrap justify-end gap-2 md:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
