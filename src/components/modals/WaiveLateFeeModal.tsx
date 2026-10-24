'use client';

import React, { useEffect, useState } from 'react';

import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { formatCurrency } from '@/lib/currency';
import { FEE_WAIVER_REASON_MIN, Rental } from '@/types';

interface WaiveLateFeeModalProps {
  isOpen: boolean;
  rental: Rental | null;
  onClose: () => void;
  onWaived: () => void;
}

/**
 * Admin waives the Late Fee of a returned Rental, such as one charged because
 * the cashier marked the Return late. The Return booked the Late Fee as paid,
 * so the waiver takes it back out of the same cash or bank account.
 */
export function WaiveLateFeeModal({ isOpen, rental, onClose, onWaived }: WaiveLateFeeModalProps) {
  const { success, error: toastError } = useToast();
  const lateFee = rental?.late_fee || 0;
  const [amount, setAmount] = useState(lateFee);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount(lateFee);
      setReason('');
    }
  }, [isOpen, rental?.id, lateFee]);

  const reasonShort = reason.trim().length < FEE_WAIVER_REASON_MIN;
  const amountWrong = amount <= 0 || amount > lateFee;

  const submit = async () => {
    if (!rental || reasonShort || amountWrong) return;
    setSubmitting(true);
    try {
      await apiClient.waiveCompletedLateFee(rental.id, amount, reason.trim());
      success('Late Fee waived', `${formatCurrency(amount)} came off the Late Fee and out of the books.`);
      onWaived();
    } catch (e) {
      toastError('Could not waive the Late Fee', apiErrorMessage(e, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen && Boolean(rental)}
      title="Waive Late Fee"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={submitting} disabled={reasonShort || amountWrong}>
            Waive {formatCurrency(amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          The Return charged a Late Fee of <b>{formatCurrency(lateFee)}</b> and booked it as paid. The waiver takes the
          amount back out of the same cash or bank account and out of the revenue. Use it when the customer did not pay
          it, such as when the cashier marked the Return late.
        </p>
        <CurrencyInput
          label="Amount to waive"
          value={amount}
          onChange={(n) => setAmount(n || 0)}
          error={amountWrong ? `Type an amount from 1 to ${formatCurrency(lateFee)}` : undefined}
        />
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="For example: returned on time on 13 Aug, the cashier marked the Return on 15 Aug"
          helperText={`At least ${FEE_WAIVER_REASON_MIN} characters. It stays on the Rental.`}
        />
      </div>
    </SimpleModal>
  );
}
