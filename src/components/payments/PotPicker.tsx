'use client';

import React from 'react';
import clsx from 'clsx';
import { BANK_POTS, POT_MISSING_MESSAGE, isNonCashMethod } from '@/lib/pots';

interface PotPickerProps {
  /** The payment method. Cash needs no Pot, so the picker hides. */
  method?: string | null;
  pot?: string;
  onChange: (pot: string) => void;
  /** "Paid into" for money in, "Paid from" for money out. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

// PotPicker asks which bank account a non-cash payment went to or left from:
// BCA or BNI. The books keep each bank as its own Pot, so the choice is needed
// on every transfer, QRIS, and card payment.
export function PotPicker({ method, pot, onChange, label = 'Paid into', disabled, className }: PotPickerProps) {
  if (!isNonCashMethod(method)) return null;
  const missing = pot !== 'bca' && pot !== 'bni';
  return (
    <div className={clsx('space-y-1', className)} data-testid="pot-picker">
      <span className="block text-xs font-medium text-slate-700">{label}</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label}>
        {BANK_POTS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={pot === option.value}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={clsx(
              'h-10 rounded-lg border text-sm font-semibold transition',
              pot === option.value
                ? 'border-slate-900 bg-slate-900 text-white'
                : missing
                  ? 'border-amber-400 bg-white text-slate-700 hover:bg-amber-50'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
            )}
            data-testid={`pot-${option.value}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {missing && <span className="block text-xs text-amber-700">{POT_MISSING_MESSAGE}</span>}
    </div>
  );
}
