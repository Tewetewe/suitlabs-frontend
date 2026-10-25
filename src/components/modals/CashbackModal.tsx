'use client';

import React, { useEffect, useState } from 'react';

import SimpleModal from '@/components/modals/SimpleModal';
import { PotPicker } from '@/components/payments/PotPicker';
import { Button } from '@/components/ui/Button';
import { NumberInput, Textarea } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useDefaultBankPot } from '@/hooks/useDefaultBankPot';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { cashbackAmount } from '@/lib/cashback';
import { formatCurrency } from '@/lib/currency';
import { POT_MISSING_MESSAGE, potForRequest, potMissing } from '@/lib/pots';
import type { Booking } from '@/types';

interface CashbackModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onGiven: () => void;
}

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
] as const;

/**
 * Staff give a percent of the booking subtotal back, during the rental or
 * after it. The books lower the booking revenue; the booking amounts stay.
 * One per booking.
 */
export function CashbackModal({ isOpen, booking, onClose, onGiven }: CashbackModalProps) {
  const { success, error: toastError } = useToast();
  const [percent, setPercent] = useState(0);
  const [method, setMethod] = useState<'cash' | 'transfer'>('cash');
  const [pot, setPot] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useDefaultBankPot(method, pot, setPot);

  useEffect(() => {
    if (isOpen) {
      setPercent(0);
      setMethod('cash');
      setPot('');
      setReason('');
    }
  }, [isOpen, booking?.id]);

  const paid = booking?.paid_amount || 0;
  // The subtotal is the amount before any discount, as the backend reads it.
  const subtotal = booking?.total_amount || 0;
  const amount = cashbackAmount(subtotal, percent);
  const amountWrong = percent <= 0 || percent > 100 || amount < 1 || amount > paid;
  const reasonMissing = reason.trim() === '';
  const bankMissing = potMissing(method, pot);

  const submit = async () => {
    if (!booking || amountWrong || reasonMissing || bankMissing) return;
    setSubmitting(true);
    try {
      await apiClient.giveCashback(booking.id, {
        percent,
        payment_method: method,
        pot: potForRequest(method, pot),
        reason: reason.trim(),
      });
      success('Cashback given', `${formatCurrency(amount)} went back to the customer.`);
      onGiven();
    } catch (e) {
      toastError('Could not give the cashback', apiErrorMessage(e, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen && Boolean(booking)}
      title="Cashback"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} loading={submitting} disabled={amountWrong || reasonMissing || bankMissing} data-testid="cashback-submit">
            Give {formatCurrency(amount)}
          </Button>
        </>
      }
    >
      {booking && (
        <div className="space-y-4" data-testid="cashback-form">
          <p className="text-sm text-slate-700">
            The cashback is a percent of the booking subtotal of <b>{formatCurrency(subtotal)}</b>. It lowers the
            booking revenue in the books; the booking amounts stay. One cashback per booking.
          </p>
          <NumberInput
            label="Percent of the subtotal"
            min={0}
            max={100}
            value={percent || ''}
            onChange={(n) => setPercent(n || 0)}
            error={
              percent > 100
                ? 'Pick a percent from 1 to 100'
                : amount > paid
                  ? `The cashback cannot be more than the ${formatCurrency(paid)} paid`
                  : undefined
            }
            helperText={percent > 0 ? `${percent}% × ${formatCurrency(subtotal)} = ${formatCurrency(amount)}` : undefined}
          />
          <div className="space-y-1">
            <span className="block text-xs font-medium text-slate-700">Give as</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Give as">
              {METHODS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={method === option.value ? 'primary' : 'secondary'}
                  aria-pressed={method === option.value}
                  onClick={() => setMethod(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <PotPicker method={method} pot={pot} onChange={setPot} label="Paid from" />
          {bankMissing && <p className="text-xs text-amber-700">{POT_MISSING_MESSAGE}</p>}
          <Textarea
            label="Reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="For example: Google review promo"
            maxLength={500}
          />
        </div>
      )}
    </SimpleModal>
  );
}
