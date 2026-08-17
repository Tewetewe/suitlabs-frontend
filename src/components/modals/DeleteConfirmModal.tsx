'use client';

import React from 'react';
import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';
import { Item } from '@/types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: Item | null;
  loading?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  loading = false,
}: DeleteConfirmModalProps) {
  return (
    <SimpleModal
      isOpen={isOpen && Boolean(item)}
      title="Delete item"
      onClose={loading ? () => undefined : onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button>
        </>
      }
    >
      {item && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Remove <span className="font-medium text-slate-900">{item.name}</span> ({item.code}) from inventory? This cannot be undone.
          </p>
          <p className="text-xs capitalize text-slate-500">{item.status} · {item.condition}</p>
        </div>
      )}
    </SimpleModal>
  );
}
