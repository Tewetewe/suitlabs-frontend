import React from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Input — slate border, indigo focus ring
// ---------------------------------------------------------------------------

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  /** Small icon shown on the left inside the input */
  prefixIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  fullWidth = true,
  className,
  id,
  prefixIcon,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={clsx(fullWidth ? 'w-full' : 'w-auto')} suppressHydrationWarning>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative" suppressHydrationWarning>
        {prefixIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {prefixIcon}
          </span>
        )}
        <input
          id={inputId}
          className={clsx(
            'block w-full rounded-xl border text-slate-900',
            'glass-control',
            'placeholder:text-slate-400 text-sm',
            'min-h-[40px] px-3 py-2 touch-manipulation',
            prefixIcon && 'pl-9',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-black/10 focus:border-indigo-500/60 focus:ring-indigo-500/40',
            'focus:outline-none focus:ring-1 transition-colors',
            className
          )}
          suppressHydrationWarning
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

