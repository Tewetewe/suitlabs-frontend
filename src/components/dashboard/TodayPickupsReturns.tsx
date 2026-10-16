'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck, PackageCheck } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import apiClient from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { pickupState, returnState, sortReturns, type TodayState } from '@/lib/today-lists';
import type { PickupPrep, ReturnCheck } from '@/types';

/** A list shows this many rows; the page it links to has the rest. */
const MAX_ROWS = 8;

type Row = {
  id: string;
  name: string;
  detail: string;
  state: TodayState;
};

/**
 * The Pickups and the Returns of today in shop time, one row each. A row opens
 * the page where the work is done: Pickup Prep for a Pickup, Return Check for
 * a Return.
 */
export function TodayPickupsReturns() {
  const [date, setDate] = useState('');
  const [pickups, setPickups] = useState<PickupPrep[]>([]);
  const [returns, setReturns] = useState<ReturnCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      // Return Check with no date is today in shop time; Pickup Prep then uses the same day.
      const returnDay = await apiClient.getReturnCheckDay();
      const pickupDay = await apiClient.getPickupPrepDay(returnDay.date);
      setDate(returnDay.date);
      setReturns(sortReturns(returnDay.rentals));
      setPickups(pickupDay.rentals);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A screen left open on the counter moves to the next day by itself.
  useAutoRefresh(() => void load(), 5 * 60_000);

  const showBranch = new Set([...pickups, ...returns].map((r) => r.branch_id)).size > 1;
  const detail = (parts: Array<string | false | undefined>) => parts.filter(Boolean).join(' · ');

  const pickupRows: Row[] = pickups.map((p) => ({
    id: p.rental_id,
    name: p.customer_name,
    detail: detail([
      p.invoice_number,
      `${p.items_total} ${p.items_total === 1 ? 'item' : 'items'}`,
      p.remaining_amount > 0 && `To pay ${formatCurrency(p.remaining_amount)}`,
      showBranch && p.branch_name,
    ]),
    state: pickupState(p.status),
  }));
  const returnRows: Row[] = returns.map((r) => ({
    id: r.rental_id,
    name: r.customer_name,
    detail: detail([
      r.invoice_number,
      `${r.items_total} ${r.items_total === 1 ? 'item' : 'items'}`,
      showBranch && r.branch_name,
    ]),
    state: returnState(r),
  }));

  return (
    <Card data-testid="today-pickups-returns">
      <CardHeader>
        <CardTitle>Today{date ? ` · ${formatDate(`${date}T00:00:00`)}` : ''}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && !date ? (
          <p className="text-sm text-red-700">Could not load today&apos;s Pickups and Returns.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TodayList
              title="Pickups today"
              icon={<ClipboardCheck className="h-4 w-4 text-indigo-600" />}
              rows={pickupRows}
              loading={loading}
              empty="No Pickups today."
              href={date ? `/dashboard/pickup-prep?date=${date}` : '/dashboard/pickup-prep'}
              linkLabel="Prepare on Pickup Prep"
            />
            <TodayList
              title="Returns today"
              icon={<PackageCheck className="h-4 w-4 text-indigo-600" />}
              rows={returnRows}
              loading={loading}
              empty="No Returns today."
              href="/dashboard/return-check"
              linkLabel="Check on Return Check"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TodayList({
  title,
  icon,
  rows,
  loading,
  empty,
  href,
  linkLabel,
}: {
  title: string;
  icon: React.ReactNode;
  rows: Row[];
  loading: boolean;
  empty: string;
  href: string;
  linkLabel: string;
}) {
  const shown = rows.slice(0, MAX_ROWS);
  const more = rows.length - shown.length;
  return (
    <section>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">{icon}</span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {!loading && <span className="text-sm text-slate-500">({rows.length})</span>}
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading...</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-black/5">
          {shown.map((row) => (
            <li key={row.id}>
              <Link href={href} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{row.name}</div>
                  {row.detail && <div className="truncate text-xs text-slate-500">{row.detail}</div>}
                </div>
                <Badge variant={row.state.tone} dot className="shrink-0">
                  {row.state.label}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link href={href} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-800">
        {more > 0 ? `${more} more · ${linkLabel}` : linkLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
