'use client';

import React, { useEffect, useState } from 'react';
import { Select } from './Select';

export interface SearchSelectOption {
  value: string;
  label: string;
}

interface SearchSelectProps {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  fetchOptions: (query: string) => Promise<SearchSelectOption[]>;
  placeholderOption?: SearchSelectOption;
  error?: string;
  searchPlaceholder?: string;
}

export function SearchSelect({
  label,
  value,
  onChange,
  fetchOptions,
  placeholderOption = { value: '', label: 'Select…' },
  error,
  searchPlaceholder = 'Search (2+ chars)'
}: SearchSelectProps) {
  const [options, setOptions] = useState<SearchSelectOption[]>([placeholderOption]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSearching(true);
        const opts = await fetchOptions('');
        if (!cancelled) setOptions([placeholderOption, ...opts]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const opts = await fetchOptions(query.trim());
        if (!cancelled) setOptions([placeholderOption, ...opts]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, fetchOptions, placeholderOption]);

  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      error={error}
      searchable
      onSearch={setQuery}
      searching={searching}
      searchPlaceholder={searchPlaceholder}
    />
  );
}

export default SearchSelect;


