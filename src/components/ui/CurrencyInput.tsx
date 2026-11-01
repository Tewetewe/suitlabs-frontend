'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { currencyDraft, formatCurrency, formatNumber, parseCurrency } from '@/lib/currency';

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

/**
 * A Rupiah amount. While the field has focus it shows the plain digits and
 * never moves the caret: an Android keyboard (Samsung, Gboard) that composes
 * digits puts each one at the caret, and a caret moved back by the field put
 * each new digit in front, so 125 came out as 521. The line under the field
 * shows the amount with dots while typing, and the field shows them again on
 * blur.
 */
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
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');
  const empty = value === '' || value === undefined || value === null;
  const numeric = empty ? 0 : parseCurrency(String(value));
  const display = focused ? draft : empty ? '' : formatNumber(numeric);
  const typed = focused && draft.length > 3 ? `= ${formatCurrency(Number(draft))}` : '';

  return (
    <Input
      id={id}
      name={name}
      label={label}
      error={error}
      helperText={[typed, helperText].filter(Boolean).join(' · ') || undefined}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      data-form-type="other"
      placeholder={placeholder}
      className={className}
      prefixIcon={<span className="text-xs font-semibold text-slate-500">Rp</span>}
      value={display}
      onFocus={(e) => {
        setDraft(empty || numeric === 0 ? '' : String(Math.round(numeric)));
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const next = currencyDraft(e.target.value);
        setDraft(next);
        onChange(next === '' ? 0 : Number(next));
      }}
    />
  );
}
