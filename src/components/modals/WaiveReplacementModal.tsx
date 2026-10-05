'use client';

import React, { useEffect, useState } from 'react';

import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { FEE_WAIVER_REASON_MIN } from '@/types';

interface WaiveReplacementModalProps {
  isOpen: boolean;
  rentalId: string;
  item: { item_id: string; code?: string; name: string } | null;
  onClose: () => void;
  onWaived: () => void;
}

/**
 * Admin writes off a missing Item with no Sale. The Item becomes Lost, its
 * value goes to Inventory Write-off, and the Customer pays nothing for it.
 */
export function WaiveReplacementModal({ isOpen, rentalId, item, onClose, onWaived }: WaiveReplacementModalProps) {
  const { success, error: toastError } = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen, item?.item_id]);

  const reasonShort = reason.trim().length < FEE_WAIVER_REASON_MIN;

  const submit = async () => {
    if (!item || reasonShort) return;
    setSubmitting(true);
    try {
      await apiClient.waiveReplacementFee(rentalId, item.item_id, reason.trim());
      success('Replacement fee waived', `${item.code || item.name} is now Lost, with no charge.`);
      onWaived();
    } catch (e) {
      toastError('Could not waive the replacement fee', apiErrorMessage(e, 'Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen && Boolean(item)}
      title="Waive replacement fee"
      onClose={onClose}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={submitting} disabled={reasonShort}>
            Write off with no charge
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-700">
          <b>{item?.code || item?.name}</b> becomes Lost and leaves the stock. Its purchase value is written off as an
          expense. The Customer pays no replacement fee, so do not make a lost-item Sale for it.
        </p>
        <Textarea
          label="Reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="For example: the Item was stolen from the customer, police report seen"
          helperText={`At least ${FEE_WAIVER_REASON_MIN} characters. It stays on the Rental.`}
        />
      </div>
    </SimpleModal>
  );
}
