'use client';

import { forwardRef } from 'react';
import clsx from 'clsx';

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
      <div className={clsx('w-full', !fullWidth && 'w-auto')}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        {searchable && (
          <input
            type="text"
            className={clsx(
              'mb-2 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm',
              'min-h-[40px]',
              error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            )}
            placeholder={searchPlaceholder}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
        )}
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm touch-manipulation',
            'min-h-[44px]', // Better touch target for mobile
            'text-gray-900 bg-white', // Ensure text is visible
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
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
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
        {searchable && searching && (
          <p className="mt-1 text-xs text-gray-400">Searching…</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
