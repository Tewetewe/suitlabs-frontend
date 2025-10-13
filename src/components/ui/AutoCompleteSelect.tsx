'use client';

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export interface AutoOption {
  value: string; // id
  label: string; // display text
}

interface AutoCompleteSelectProps {
  label?: string;
  value: string;
  onChange: (newValue: string) => void;
  fetchOptions: (query: string) => Promise<AutoOption[]>;
  placeholder?: string;
  error?: string;
  clearable?: boolean;
}

export default function AutoCompleteSelect({
  label,
  value,
  onChange,
  fetchOptions,
  placeholder = 'Search and select…',
  error,
  clearable = true,
}: AutoCompleteSelectProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AutoOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial options
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSearching(true);
        const opts = await fetchOptions('');
        if (!cancelled) setOptions((opts || []).slice(0, 20));
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // minimal input
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const opts = await fetchOptions(q);
        if (!cancelled) setOptions((opts || []).slice(0, 20));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, fetchOptions]);

  // Ensure input displays the selected option's label when value is set
  const selectedLabel = options.find(o => o.value === value)?.label || '';

  // Close on click outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(-1);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const visibleOptions = options;

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <input
        className={clsx(
          'block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm',
          'min-h-[44px] whitespace-nowrap overflow-hidden text-ellipsis pr-8',
          error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        )}
        placeholder={searching ? 'Searching…' : placeholder}
        value={query || selectedLabel}
        onChange={(e) => {
          const text = e.target.value;
          setQuery(text);
          setOpen(true);
          // If text exactly matches an option, update value
          const match = options.find(o => o.label === text || o.value === text);
          if (match) onChange(match.value);
        }}
        autoComplete="off"
        title=""
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const text = (e.currentTarget as HTMLInputElement).value.trim();
            const match = options.find(o => o.label.toLowerCase() === text.toLowerCase());
            if (highlight >= 0 && highlight < visibleOptions.length) {
              onChange(visibleOptions[highlight].value);
              setOpen(false);
              setQuery('');
            } else if (!match && visibleOptions.length > 0 && text.length >= 2) {
              onChange(visibleOptions[0].value);
              setQuery('');
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min((h < 0 ? -1 : h) + 1, visibleOptions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Escape') {
            setOpen(false);
            setHighlight(-1);
          }
        }}
        onFocus={() => setOpen(true)}
      />
      {clearable && value && (
        <button
          type="button"
          aria-label="Clear selection"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
      {open && visibleOptions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {visibleOptions.map((o, idx) => (
            <li
              key={o.value}
              className={clsx(
                'cursor-pointer px-3 py-2 text-sm hover:bg-gray-50',
                idx === highlight && 'bg-gray-100'
              )}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => {
                // prevent input blur before click
                e.preventDefault();
                onChange(o.value);
                setOpen(false);
                setQuery('');
              }}
              title={o.label}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}


