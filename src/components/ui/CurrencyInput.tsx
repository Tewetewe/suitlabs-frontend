'use client';

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
  const empty = value === '' || value === undefined || value === null;
  const numeric = empty ? 0 : parseCurrency(String(value));

  return (
    <Input
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
      value={empty ? '' : formatNumber(numeric)}
      onChange={(e) => onChange(parseCurrency(e.target.value))}
    />
  );
}
