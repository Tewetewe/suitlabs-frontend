'use client';

import { useLayoutEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { formatNumber, parseCurrency } from '@/lib/currency';

type CurrencyInputProps = {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  value: number | string;
  onChange: (value: number) => void;
};

function caretFromDigitCount(formatted: string, digitsBefore: number): number {
  if (digitsBefore <= 0) return formatted.startsWith('-') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen += 1;
      if (seen >= digitsBefore) return i + 1;
    }
  }
  return formatted.length;
}

export function CurrencyInput({
  label,
  error,
  helperText,
  fullWidth,
  disabled,
  required,
  placeholder = '0',
  id,
  name,
  className,
  value,
  onChange,
}: CurrencyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretDigits = useRef<number | null>(null);
  const empty = value === '' || value === undefined || value === null;
  const numeric = empty ? 0 : parseCurrency(String(value));
  const display = empty ? '' : formatNumber(numeric);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el || caretDigits.current == null) return;
    const pos = caretFromDigitCount(el.value, caretDigits.current);
    el.setSelectionRange(pos, pos);
    caretDigits.current = null;
  }, [display]);

  return (
    <Input
      ref={inputRef}
      id={id}
      name={name}
      label={label}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      inputMode="numeric"
      autoComplete="off"
      data-form-type="other"
      placeholder={placeholder}
      className={className}
      prefixIcon={<span className="text-xs font-semibold text-slate-500">Rp</span>}
      value={display}
      onChange={(e) => {
        const el = e.target;
        caretDigits.current = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
        onChange(parseCurrency(el.value));
      }}
    />
  );
}
