'use client';

import React from 'react';
import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';

interface GenericDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemDetails?: string;
  loading?: boolean;
}

export default function GenericDeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemDetails,
  loading = false,
}: GenericDeleteConfirmModalProps) {
  return (
    <SimpleModal
      isOpen={isOpen}
      title={title}
      onClose={loading ? () => undefined : onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Delete</Button>
        </>
      }
    >
      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          Remove <span className="font-medium text-slate-900">{itemName}</span>? This cannot be undone.
        </p>
        {itemDetails && <p className="text-xs text-slate-500">{itemDetails}</p>}
      </div>
    </SimpleModal>
  );
}
