'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

// ---------------------------------------------------------------------------
// Select — slate border, indigo focus ring
// ---------------------------------------------------------------------------

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  fullWidth?: boolean;
  searchable?: boolean;
  onSearch?: (value: string) => void;
  searching?: boolean;
  searchPlaceholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, fullWidth = true, className, id, searchable = false, onSearch, searching = false, searchPlaceholder = 'Type to search…', ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={clsx(fullWidth ? 'w-full' : 'w-auto')}>
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}

        {searchable && (
          <input
            type="text"
            className="mb-2 block w-full rounded-xl glass-control px-3 py-2 text-sm placeholder:text-slate-400 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 min-h-[40px]"
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        )}

        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'block w-full rounded-xl border text-slate-900 glass-control',
            'text-sm min-h-[40px] px-3 py-2 touch-manipulation',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-black/10 focus:border-indigo-500/60 focus:ring-indigo-500/40',
            'focus:outline-none focus:ring-1 transition-colors',
            className
          )}
          suppressHydrationWarning
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
        {searchable && searching && <p className="mt-1 text-xs text-slate-400">Searching…</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

