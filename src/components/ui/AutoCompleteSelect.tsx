'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useAnchoredMenu } from './anchored-menu';
import { CONTROL_CLASS, controlBorderClass, fieldLabelClass } from './field';

export interface AutoOption {
  value: string;
  label: string;
}

export interface AutoPageResult {
  options: AutoOption[];
  hasMore: boolean;
}

interface AutoCompleteSelectProps {
  label?: string;
  value: string;
  onChange: (newValue: string) => void;
  fetchOptions?: (query: string) => Promise<AutoOption[]>;
  fetchPage?: (query: string, page: number) => Promise<AutoPageResult>;
  placeholder?: string;
  error?: string;
  clearable?: boolean;
  minQueryLength?: number;
  emptyMessage?: string;
  /** Shown at the top of the list when nothing is selected (e.g. Walk-in). */
  emptyOption?: AutoOption;
}

export default function AutoCompleteSelect({
  label,
  value,
  onChange,
  fetchOptions,
  fetchPage,
  placeholder = 'Search and select…',
  error,
  clearable = true,
  minQueryLength = 0,
  emptyMessage = 'No matches',
  emptyOption,
}: AutoCompleteSelectProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<AutoOption[]>([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const menuStyle = useAnchoredMenu(open, containerRef);

  const loadPage = useCallback(
    async (q: string, nextPage: number, append: boolean) => {
      if (fetchPage) {
        const res = await fetchPage(q, nextPage);
        const list = res.options || [];
        setOptions((prev) => (append ? [...prev, ...list] : list));
        setHasMore(Boolean(res.hasMore));
        setPage(nextPage);
        return;
      }
      if (!fetchOptions) {
        setOptions([]);
        setHasMore(false);
        return;
      }
      const opts = await fetchOptions(q);
      setOptions(opts || []);
      setHasMore(false);
      setPage(1);
    },
    [fetchPage, fetchOptions]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSearching(true);
        await loadPage('', 1, false);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < minQueryLength && q.length > 0) return;
    if (!open && q.length === 0) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        await loadPage(q, 1, false);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, loadPage, minQueryLength, open]);

  useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    const match = options.find((o) => o.value === value);
    if (match) setSelectedLabel(match.label);
  }, [value, options]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current?.contains(e.target as Node)) return;
      if (listRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setHighlight(-1);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (opt: AutoOption) => {
    onChange(opt.value);
    setSelectedLabel(opt.label);
    setQuery('');
    setOpen(false);
    setHighlight(-1);
  };

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      : options;
    if (!emptyOption) return filtered;
    const matchesEmpty = !q || emptyOption.label.toLowerCase().includes(q);
    if (!matchesEmpty) return filtered;
    if (filtered.some((o) => o.value === emptyOption.value)) return filtered;
    return [emptyOption, ...filtered];
  }, [options, query, emptyOption]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || searching) return;
    try {
      setLoadingMore(true);
      await loadPage(query.trim(), page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      void loadMore();
    }
  };

  const displayValue = open ? (query || selectedLabel) : (query || selectedLabel);

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && (
        <label className={fieldLabelClass()}>{label}</label>
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className={clsx(
            CONTROL_CLASS,
            'pl-9 pr-16',
            controlBorderClass(error),
          )}
          placeholder={searching ? 'Searching…' : placeholder}
          value={displayValue}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            setHighlight(-1);
            if (value && next !== selectedLabel) onChange('');
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setOpen(true);
              setHighlight((h) => Math.min((h < 0 ? -1 : h) + 1, visibleOptions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter') {
              if (!open) return;
              e.preventDefault();
              if (highlight >= 0 && highlight < visibleOptions.length) pick(visibleOptions[highlight]);
              else if (visibleOptions.length === 1) pick(visibleOptions[0]);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setHighlight(-1);
            }
          }}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {searching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
          {clearable && value && (
            <button
              type="button"
              aria-label="Clear selection"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => {
                onChange('');
                setSelectedLabel('');
                setQuery('');
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
        </div>
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <ul
          id={listId}
          ref={listRef}
          onScroll={onListScroll}
          role="listbox"
          style={menuStyle}
          className="overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg"
        >
          {visibleOptions.length === 0 && !searching && (
            <li className="px-3 py-3 text-sm text-slate-500">{emptyMessage}</li>
          )}
          {visibleOptions.map((o, idx) => (
            <li
              key={o.value || 'empty'}
              className={clsx(
                'cursor-pointer px-3 py-2.5 text-sm text-slate-800',
                idx === highlight || o.value === value ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50'
              )}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              title={o.label}
            >
              {o.label}
            </li>
          ))}
          {hasMore && (
            <li className="border-t border-black/5 px-3 py-2">
              <button
                type="button"
                className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void loadMore();
                }}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </li>
          )}
        </ul>,
        document.body,
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
