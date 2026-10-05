'use client';

import React, { useMemo, useState } from 'react';
import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { Item } from '@/types';

interface TransferItemModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onTransferred: (item: Item) => void;
}

export function TransferItemModal({ isOpen, item, onClose, onTransferred }: TransferItemModalProps) {
  const { branches } = useBranch();
  const { success, error } = useToast();
  const [toBranchId, setToBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  const destinations = useMemo(
    () => branches.filter((branch) => branch.is_active && branch.id !== item?.branch_id),
    [branches, item?.branch_id]
  );

  if (!isOpen || !item) return null;

  const canTransfer = item.status === 'available' && (item.available_qty ?? item.quantity) >= 1;

  const submit = async () => {
    if (!toBranchId) return;
    try {
      setSaving(true);
      const updated = await apiClient.transferItem(item.id, toBranchId);
      success('Item transferred', `${item.name} now lives at the destination shop`);
      onTransferred(updated);
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      error('Transfer failed', message || 'The item could not be moved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Transfer item"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={saving || !canTransfer || !toBranchId}>
            {saving ? 'Transferring…' : 'Transfer'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Move <span className="font-medium text-slate-900">{item.name}</span> to another shop.
          Only available items can be transferred.
        </p>
        {!canTransfer && (
          <p className="text-sm text-amber-700">This item is not available to transfer.</p>
        )}
        <Select
          searchable={false}
          label="Destination"
          value={toBranchId}
          onChange={(e) => setToBranchId(e.target.value)}
          options={[
            { value: '', label: 'Select a shop' },
            ...destinations.map((branch) => ({ value: branch.id, label: branch.name })),
          ]}
        />
      </div>
    </SimpleModal>
  );
}
