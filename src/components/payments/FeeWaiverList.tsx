'use client';

import React, { useEffect, useState } from 'react';

import { DetailSection, MoneyRow } from '@/components/modals/detail-layout';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import type { FeeWaiver } from '@/types';

/** The Late Fees and replacement fees that Admin waived on one Rental. */
export function FeeWaiverList({ rentalId }: { rentalId: string }) {
  const [waivers, setWaivers] = useState<FeeWaiver[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .getFeeWaivers(rentalId)
      .then((rows) => {
        if (!cancelled) setWaivers(rows);
      })
      .catch(() => {
        if (!cancelled) setWaivers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [rentalId]);

  if (waivers.length === 0) return null;

  return (
    <DetailSection label="Waived fees">
      <div className="space-y-3">
        {waivers.map((w) => (
          <div key={w.id} className="space-y-1">
            <MoneyRow
              label={
                w.kind === 'late_fee'
                  ? `Late fee waived (of ${formatCurrency(w.fee_amount)})`
                  : `Replacement fee waived · ${w.item?.code || w.item?.name || 'Item'}`
              }
              value={`-${formatCurrency(w.waived_amount)}`}
              tone="success"
            />
            <p className="text-xs text-slate-500">
              {w.reason} · {formatDateTime(w.created_at)}
            </p>
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
