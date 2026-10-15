'use client';

import React from 'react';
import clsx from 'clsx';
import { Banknote, CreditCard, Landmark, QrCode, Wallet } from 'lucide-react';
import type { SalePaymentMethod } from '@/types';

export const PAY_CHANNELS: Array<{ value: SalePaymentMethod; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
  { value: 'transfer', label: 'Transfer', icon: Landmark },
  { value: 'debit', label: 'Debit', icon: Wallet },
  { value: 'cc', label: 'Card', icon: CreditCard },
];

/** The method of a booking Payment Method (dp_qris → qris), or cash when it has none. */
export function payChannelOf(method?: string | null): SalePaymentMethod {
  const channel = String(method || '').replace(/^dp_/, '').replace(/^full_/, '');
  return PAY_CHANNELS.some((c) => c.value === channel) ? (channel as SalePaymentMethod) : 'cash';
}

interface PaymentMethodPickerProps {
  value: SalePaymentMethod;
  onChange: (value: SalePaymentMethod) => void;
  /** Each button gets the test id `${testIdPrefix}-${method}`. */
  testIdPrefix?: string;
  disabled?: boolean;
}

// PaymentMethodPicker is the row of method buttons the cashier POS uses. Every
// screen that takes a booking payment shows the same row.
export function PaymentMethodPicker({ value, onChange, testIdPrefix = 'pay', disabled }: PaymentMethodPickerProps) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Method</div>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Payment method">
        {PAY_CHANNELS.map(({ value: channel, label, icon: Icon }) => (
          <button
            key={channel}
            type="button"
            data-testid={`${testIdPrefix}-${channel}`}
            aria-pressed={value === channel}
            disabled={disabled}
            onClick={() => onChange(channel)}
            className={clsx(
              'flex min-h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold touch-manipulation disabled:opacity-50',
              value === channel ? 'bg-indigo-600 text-white shadow-sm' : 'glass-control text-slate-600',
            )}
          >
            <Icon className="mb-0.5 h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
