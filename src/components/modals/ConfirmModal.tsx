'use client';

import React from 'react';
import SimpleModal from '@/components/modals/SimpleModal';
import { Button } from '@/components/ui/Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onClose,
  onConfirm,
  children,
}: ConfirmModalProps) {
  return (
    <SimpleModal
      isOpen={isOpen}
      title={title}
      onClose={loading ? () => undefined : onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} loading={loading} onClick={() => void onConfirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {typeof description === 'string' ? (
          <p className="text-sm text-slate-600">{description}</p>
        ) : (
          description
        )}
        {children}
      </div>
    </SimpleModal>
  );
}
