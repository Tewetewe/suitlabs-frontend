'use client';

import React, { forwardRef, useEffect, useState } from 'react';
import clsx from 'clsx';
import { CONTROL_CLASS, controlBorderClass, fieldLabelClass, isDecimalStep, isNumericDraft } from './field';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  /** Small icon shown on the left inside the input */
  prefixIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helperText,
    fullWidth = true,
    className,
    id,
    prefixIcon,
    type = 'text',
    onChange,
    autoComplete,
    inputMode,
    autoCorrect,
    spellCheck,
    enterKeyHint,
    ...props
  },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const isNumeric = type === 'number';
  const decimal = isNumeric && isDecimalStep(props.step);
  const isDate = type === 'date' || type === 'datetime-local' || type === 'time';
  const hint = enterKeyHint ?? (type === 'search' ? 'search' : type === 'tel' ? 'done' : 'next');

  return (
    <div className={clsx(fullWidth ? 'w-full' : 'w-auto')} suppressHydrationWarning>
      {label && (
        <label htmlFor={inputId} className={fieldLabelClass()}>
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
          {...props}
          ref={ref}
          id={inputId}
          type={isNumeric ? 'text' : type}
          inputMode={inputMode || (isNumeric ? (decimal ? 'decimal' : 'numeric') : type === 'tel' ? 'tel' : undefined)}
          autoComplete={autoComplete ?? (isNumeric || isDate ? 'off' : undefined)}
          autoCorrect={autoCorrect ?? (isNumeric ? 'off' : undefined)}
          spellCheck={spellCheck ?? (isNumeric ? false : undefined)}
          enterKeyHint={hint}
          {...(isNumeric || isDate
            ? { 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-form-type': 'other' }
            : {})}
          onChange={(e) => {
            if (isNumeric && !isNumericDraft(e.target.value, decimal)) return;
            onChange?.(e);
          }}
          className={clsx(
            CONTROL_CLASS,
            prefixIcon && 'pl-9',
            isDate && '[appearance:auto] [-webkit-appearance:auto]',
            isNumeric && 'tabular-nums',
            controlBorderClass(error),
            className,
          )}
          suppressHydrationWarning
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helperText, fullWidth = true, className, id, rows = 3, enterKeyHint, ...props },
  ref,
) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={clsx(fullWidth ? 'w-full' : 'w-auto')}>
      {label && (
        <label htmlFor={inputId} className={fieldLabelClass()}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        ref={ref}
        id={inputId}
        rows={rows}
        enterKeyHint={enterKeyHint ?? 'enter'}
        className={clsx(
          CONTROL_CLASS,
          'min-h-[5.5rem] resize-y py-2.5 leading-5',
          controlBorderClass(error),
          className,
        )}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
});

type NumberInputProps = Omit<InputProps, 'type' | 'value' | 'onChange' | 'inputMode'> & {
  value: number | string;
  onChange: (value: number) => void;
  integer?: boolean;
};

/** Qty and similar counts: empty while retyping does not snap back to 0. */
export function NumberInput({
  value,
  onChange,
  integer = true,
  min,
  max,
  onBlur,
  onFocus,
  ...props
}: NumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const empty = value === '' || value === undefined || value === null;
  const numeric = empty ? 0 : Number(value) || 0;
  const display = focused ? draft : empty ? '' : String(numeric);

  useEffect(() => {
    if (!focused) setDraft(numeric ? String(numeric) : '');
  }, [numeric, focused]);

  const commit = (raw: string) => {
    if (raw === '' || raw === '-') return;
    let n = Number(String(raw).replace(',', '.'));
    if (!Number.isFinite(n)) return;
    if (integer) n = Math.round(n);
    if (min != null && n < Number(min)) n = Number(min);
    if (max != null && n > Number(max)) n = Number(max);
    onChange(n);
  };

  return (
    <Input
      {...props}
      type="number"
      step={integer ? 1 : props.step ?? 'any'}
      min={min}
      max={max}
      inputMode={integer ? 'numeric' : 'decimal'}
      value={display}
      onFocus={(e) => {
        setFocused(true);
        setDraft(numeric ? String(numeric) : '');
        e.target.select();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        commit(draft);
        setFocused(false);
        onBlur?.(e);
      }}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (next === '' || next === '-') return;
        const n = Number(String(next).replace(',', '.'));
        if (!Number.isFinite(n)) return;
        onChange(integer ? Math.round(n) : n);
      }}
    />
  );
}

export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {children}
    </section>
  );
}

export function FilePick({
  id,
  label,
  accept,
  disabled,
  onChange,
  hint,
  error,
  buttonLabel = 'Choose file',
  fullWidth = false,
}: {
  id: string;
  label?: string;
  accept?: string;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  hint?: string;
  error?: string;
  buttonLabel?: string;
  fullWidth?: boolean;
}) {
  return (
    <div className={clsx('space-y-1.5', fullWidth && 'w-full')}>
      {label && <div className="text-sm font-medium text-slate-700">{label}</div>}
      <label
        htmlFor={id}
        className={clsx(
          'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-medium glass-panel text-slate-800',
          fullWidth && 'w-full',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <input
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          className="sr-only"
          data-testid={id}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        {buttonLabel}
      </label>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
