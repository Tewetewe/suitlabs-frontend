'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort, formatDateTime } from '@/lib/date';
import type { LegacyDuplicate } from '@/types';

// Temporary: goes with the Legacy Bookings page once the legacy import is removed.

/** The status a booking had before Sync set it aside, as the page names it. */
function statusLabel(duplicate: LegacyDuplicate): string {
  const status = duplicate.rental_status || duplicate.booking_status;
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : '';
}

/**
 * The bookings the legacy Sync set aside as duplicates of one sheet row. Each
 * one can come back: Restore gives it its status, its money, and its row on
 * the monthly tab, and the next Sync leaves it alone.
 */
export function LegacyDuplicatesCard({ branchId, refreshKey }: { branchId: string; refreshKey?: string }) {
  const { success, error: toastError } = useToast();
  const [duplicates, setDuplicates] = useState<LegacyDuplicate[]>([]);
  const [restoring, setRestoring] = useState<LegacyDuplicate | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setDuplicates(await apiClient.getLegacyDuplicates(branchId));
    } catch {
      setDuplicates([]);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (duplicates.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duplicates set aside</CardTitle>
        <p className="mt-1 text-xs text-slate-500">
          A sheet row edited after its import was imported again. Sync kept the booking furthest forward and set the
          other aside: Cancelled, its money reversed, its row off the monthly tab. Restore one that is a real booking.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-black/5">
          {duplicates.map((d) => (
            <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <div className="font-medium text-slate-900">
                  {d.customer_name || d.phone} · {d.booking_id.slice(0, 8)}
                </div>
                <div className="text-slate-600">
                  {d.phone}
                  {d.event_date ? ` · event ${formatDateShort(d.event_date)}` : ''} · was {statusLabel(d)} ·{' '}
                  {formatCurrency(d.final_amount)} · kept {d.kept_booking_id.slice(0, 8)}
                </div>
                <div className="text-xs text-slate-500">Set aside {formatDateTime(d.removed_at)}</div>
              </div>
              {d.restored_at ? (
                <Badge variant="success">Restored {formatDateShort(d.restored_at)}</Badge>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setRestoring(d)}>
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>

      <ConfirmModal
        isOpen={Boolean(restoring)}
        title="Restore booking"
        description={
          restoring
            ? `Put booking ${restoring.booking_id.slice(0, 8)} of ${restoring.customer_name || restoring.phone} back as ${statusLabel(restoring)}, with its money and its row on the monthly tab? It then counts as a booking of its own, next to ${restoring.kept_booking_id.slice(0, 8)}, and Sync leaves it alone.`
            : undefined
        }
        confirmLabel="Restore"
        loading={busy}
        onClose={() => setRestoring(null)}
        onConfirm={async () => {
          if (!restoring) return;
          setBusy(true);
          try {
            await apiClient.restoreLegacyDuplicate(restoring.id);
            success('Booking restored', restoring.customer_name || restoring.phone);
            setRestoring(null);
            await load();
          } catch (e: unknown) {
            toastError('Could not restore the booking', apiErrorMessage(e, 'Restore failed'));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}
