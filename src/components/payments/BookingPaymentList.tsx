'use client';

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { bookingPaymentLabels } from '@/lib/booking-payments';
import type { BookingPayment } from '@/types';

interface BookingPaymentListProps {
  bookingId: string;
  /** The booking's Payment Method, so the first payment reads as DP or full payment. */
  paymentMethod?: string | null;
}

// BookingPaymentList shows each payment of a Booking with the bank it went
// into, from the books. Every payment shows, with or without a receipt.
export function BookingPaymentList({ bookingId, paymentMethod }: BookingPaymentListProps) {
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    let live = true;
    setLoading(true);
    apiClient
      .getBookingPayments(bookingId)
      .then((rows) => {
        if (live) setPayments(rows);
      })
      .catch((err) => {
        console.warn('Could not load booking payments', err);
        if (live) setPayments([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [bookingId]);

  if (loading) return <p className="text-xs text-slate-500">Loading payments…</p>;
  if (payments.length === 0) return <p className="text-xs text-slate-500">No payment yet.</p>;

  const labels = bookingPaymentLabels(payments, paymentMethod);
  return (
    <ul className="space-y-1.5" data-testid="booking-payment-list">
      {payments.map((payment, index) => (
        <li key={`${payment.paid_on}-${index}`} className="flex items-baseline justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="font-medium text-slate-800">{labels[index]}</span>
            <span className="ml-2 text-xs text-slate-500">{formatDateShort(payment.paid_on)}</span>
          </span>
          <span className={`tabular-nums ${payment.kind === 'refund' ? 'text-red-600' : 'text-slate-900'}`}>
            {payment.kind === 'refund' ? '−' : ''}{formatCurrency(payment.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
