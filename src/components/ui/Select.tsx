'use client';

import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';
import { useAnchoredMenu } from './anchored-menu';
import { CONTROL_CLASS, controlBorderClass, fieldLabelClass } from './field';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'placeholder'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  fullWidth?: boolean;
  searchable?: boolean;
  onSearch?: (value: string) => void;
  searching?: boolean;
  searchPlaceholder?: string;
  size?: 'sm' | 'md';
  emptyMessage?: string;
  placeholder?: string;
  allowCustom?: boolean;
  clearable?: boolean;
}

function emitChange(
  onChange: SelectProps['onChange'],
  value: string,
  name?: string,
  id?: string,
) {
  onChange?.({
    target: { value, name, id },
    currentTarget: { value, name, id },
  } as React.ChangeEvent<HTMLSelectElement>);
}

export const Select = forwardRef<HTMLInputElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      fullWidth = true,
      className,
      id,
      searchable = true,
      onSearch,
      searching = false,
      searchPlaceholder = 'Search…',
      size = 'md',
      emptyMessage = 'No matches',
      value,
      onChange,
      disabled,
      name,
      placeholder,
      allowCustom = false,
      clearable,
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : generatedId);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const selected = options.find((option) => option.value === String(value ?? ''));
    const compact = size === 'sm';
    const canClear = clearable ?? searchable;
    const selectedLabel = selected?.label || '';
    const filtering = searchable && query.trim() !== '' && query !== selectedLabel;

    const filtered = useMemo(() => {
      if (!filtering) return options;
      const q = query.trim().toLowerCase();
      return options.filter((option) => option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q));
    }, [options, query, filtering]);

    const menuStyle = useAnchoredMenu(open && !disabled, containerRef);

    useEffect(() => {
      function onDocClick(e: MouseEvent) {
        if (!containerRef.current?.contains(e.target as Node)) {
          const menu = document.getElementById(`${selectId}-list`);
          if (menu?.contains(e.target as Node)) return;
          setOpen(false);
          setQuery('');
          setHighlight(-1);
        }
      }
      document.addEventListener('mousedown', onDocClick);
      return () => document.removeEventListener('mousedown', onDocClick);
    }, [selectId]);

    const pick = (option: SelectOption) => {
      emitChange(onChange, option.value, name, selectId);
      setOpen(false);
      setQuery('');
      setHighlight(-1);
    };

    const display = open && searchable ? (query || selectedLabel) : selectedLabel || query;

    const closeMenu = () => {
      setOpen(false);
      setQuery('');
      setHighlight(-1);
    };

    return (
      <div className={clsx(fullWidth ? 'w-full' : 'w-auto', 'relative')} ref={containerRef} suppressHydrationWarning>
        {label && (
          <label htmlFor={selectId} className={fieldLabelClass()}>
            {label}
          </label>
        )}
        <div className="relative" suppressHydrationWarning>
          {searchable && (
            <Search className={clsx(
              'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400',
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
            )} />
          )}
          <input
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            readOnly={!searchable}
            role="combobox"
            aria-expanded={open}
            aria-controls={selectId ? `${selectId}-list` : undefined}
            aria-invalid={Boolean(error)}
            placeholder={searching ? 'Searching…' : (placeholder || searchPlaceholder || 'Select…')}
            value={display}
            suppressHydrationWarning
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setOpen(true);
              onSearch?.(next);
            }}
            onFocus={(e) => {
              if (disabled) return;
              setOpen(true);
              onSearch?.(query);
              e.target.select();
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOpen(true);
                setHighlight((h) => Math.min((h < 0 ? -1 : h) + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter') {
                if (!open) return;
                e.preventDefault();
                if (highlight >= 0 && highlight < filtered.length) pick(filtered[highlight]);
                else if (filtered.length === 1) pick(filtered[0]);
                else if (allowCustom && query.trim()) pick({ value: query.trim(), label: query.trim() });
              } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();
              }
            }}
            className={clsx(
              CONTROL_CLASS,
              compact ? 'min-h-9 py-1.5 text-sm font-semibold' : 'min-h-[44px] py-2.5',
              searchable ? (compact ? 'pl-8 pr-14' : 'pl-9 pr-16') : (compact ? 'pl-3 pr-8' : 'pl-3 pr-10'),
              controlBorderClass(error),
              !searchable && 'cursor-pointer',
              disabled && 'cursor-not-allowed opacity-60',
              className,
            )}
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
            {searching && <Loader2 className="mr-0.5 h-4 w-4 animate-spin text-slate-400" />}
            {canClear && selected && selected.value !== '' && !disabled && (
              <button
                type="button"
                aria-label="Clear selection"
                tabIndex={-1}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                suppressHydrationWarning
                onClick={() => {
                  emitChange(onChange, '', name, selectId);
                  setQuery('');
                }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <ChevronDown className={clsx('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')} />
          </div>
        </div>

        {open && !disabled && typeof document !== 'undefined' && createPortal(
          <ul
            id={`${selectId}-list`}
            role="listbox"
            style={menuStyle}
            className="overflow-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-slate-500">{emptyMessage}</li>
            )}
            {filtered.map((option, idx) => (
              <li
                key={`${option.value}-${idx}`}
                role="option"
                aria-selected={option.value === String(value ?? '')}
                className={clsx(
                  'cursor-pointer px-3 py-2.5 text-sm text-slate-800',
                  idx === highlight || option.value === String(value ?? '')
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'hover:bg-slate-50',
                )}
                onMouseEnter={() => setHighlight(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(option);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}

        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
