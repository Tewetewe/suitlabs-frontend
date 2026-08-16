'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarCheck,
  CircleOff,
  Landmark,
  Shirt,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageSection, PageShell, StatGrid } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import apiClient from '@/lib/api';
import { Select } from '@/components/ui/Select';
import { formatCurrency, formatNumber } from '@/lib/currency';
import { facetLabel } from '@/lib/select-options';
import type { OwnerAnalytics, RentalInsight, RentalItemAnalytics } from '@/types';

type RangePreset = 'this_month' | 'last_6' | 'this_year' | 'last_year';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function rangeForPreset(preset: RangePreset, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (preset === 'this_month') {
    return {
      start: `${year}-${pad2(month)}-01`,
      end: `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`,
    };
  }
  if (preset === 'last_year') {
    return { start: `${year - 1}-01-01`, end: `${year - 1}-12-31` };
  }
  if (preset === 'this_year') {
    return { start: `${year}-01-01`, end: isoDate(today) };
  }
  const start = new Date(year, today.getMonth() - 5, 1);
  return { start: isoDate(start), end: isoDate(today) };
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function insightTone(kind: string) {
  switch (kind) {
    case 'stock_up':
      return { wrap: 'border-indigo-200 bg-indigo-50', badge: 'primary' as const };
    case 'clearance':
      return { wrap: 'border-amber-200 bg-amber-50', badge: 'warning' as const };
    case 'mix':
      return { wrap: 'border-sky-200 bg-sky-50', badge: 'info' as const };
    case 'trend':
      return { wrap: 'border-emerald-200 bg-emerald-50', badge: 'success' as const };
    case 'collect':
      return { wrap: 'border-rose-200 bg-rose-50', badge: 'danger' as const };
    default:
      return { wrap: 'border-slate-200 bg-slate-50', badge: 'default' as const };
  }
}

function insightKindLabel(kind: string) {
  switch (kind) {
    case 'stock_up':
      return 'Buy / protect';
    case 'clearance':
      return 'Clearance';
    case 'mix':
      return 'Mix';
    case 'trend':
      return 'Trend';
    case 'collect':
      return 'Collect';
    default:
      return 'Note';
  }
}

export default function RentalAnalyticsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { currentBranch, viewingAll } = useBranch();
  const isAdmin = user?.role === 'admin';
  const [preset, setPreset] = useState<RangePreset>('last_6');
  const range = useMemo(() => rangeForPreset(preset), [preset]);
  const [report, setReport] = useState<OwnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getOwnerAnalytics({ startDate: range.start, endDate: range.end })
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message?: string }).message)
            : 'Unable to load analytics';
        setError(message);
        setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, range.end, range.start, currentBranch?.id, viewingAll]);

  const stock = report?.stock;
  const bookings = report?.bookings;
  const sales = report?.sales;
  const usedBookings = stock?.source === 'bookings';
  const moved = usedBookings ? stock?.summary.items_booked || 0 : stock?.summary.items_out || 0;
  const scopeLabel = viewingAll ? 'All branches' : currentBranch?.name || 'This shop';
  const monthly = useMemo(() => mergeMonthly(report), [report]);

  return (
    <DashboardLayout>
      <PageShell
        title="Analytics"
        subtitle={`Owner read for ${scopeLabel}. Bookings, sales, collections, and stock — without opening the Google Sheet.`}
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              id="analytics-range"
              searchable={false}
              clearable={false}
              value={preset}
              onChange={(e) => setPreset(e.target.value as RangePreset)}
              options={[
                { value: 'last_6', label: 'Last 6 months' },
                { value: 'this_month', label: 'This month' },
                { value: 'this_year', label: 'This year' },
                { value: 'last_year', label: 'Last year' },
              ]}
            />
            <Link href="/dashboard/admin/financial-report" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
              <Landmark className="h-4 w-4" /> P&L
            </Link>
          </div>
        }
      >
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <StatGrid
          stats={[
            {
              label: 'Bookings',
              value: loading ? '' : formatNumber(bookings?.count || 0),
              icon: <CalendarCheck />,
              iconBg: 'bg-emerald-50',
              iconColor: 'text-emerald-600',
              sub: `${bookings?.cancelled || 0} cancelled · ${bookings?.upcoming || 0} upcoming`,
              loading,
            },
            {
              label: 'Booking value',
              value: loading ? '' : formatCurrency(bookings?.final_amount || 0),
              icon: <Wallet />,
              iconBg: 'bg-indigo-50',
              iconColor: 'text-indigo-600',
              sub: `Collected ${formatCurrency(bookings?.paid_amount || 0)}`,
              loading,
            },
            {
              label: 'Still owing',
              value: loading ? '' : formatCurrency(bookings?.remaining_amount || 0),
              icon: <TrendingUp />,
              iconBg: 'bg-rose-50',
              iconColor: 'text-rose-600',
              sub: 'Chase before month lock',
              loading,
            },
            {
              label: 'Sales',
              value: loading ? '' : formatCurrency(sales?.revenue || 0),
              icon: <ShoppingBag />,
              iconBg: 'bg-violet-50',
              iconColor: 'text-violet-600',
              sub: `${sales?.count || 0} completed`,
              loading,
            },
            {
              label: 'Went out',
              value: loading ? '' : formatNumber(stock?.summary.items_out || 0),
              icon: <Shirt />,
              iconBg: 'bg-sky-50',
              iconColor: 'text-sky-600',
              sub: `${stock?.summary.rental_count || 0} rentals`,
              loading,
            },
            {
              label: 'Idle stock',
              value: loading ? '' : formatNumber(stock?.summary.idle_count || 0),
              icon: <CircleOff />,
              iconBg: 'bg-amber-50',
              iconColor: 'text-amber-600',
              sub: `${stock?.summary.catalogue_items || 0} in catalogue`,
              loading,
            },
          ]}
        />

        {usedBookings && !loading && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            No pickups in this period, so stock mix is from <b>bookings</b>. Convert to rentals at pickup to see what actually left the shop.
          </p>
        )}

        <PageSection title="What to do next" description="Read these before buying, transferring, or locking the month. This replaces scanning the monthly sheet.">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 animate-skeleton rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <InsightList insights={report?.insights || []} />
          )}
        </PageSection>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3" padding="md">
            <CardHeader>
              <CardTitle>Monthly volume</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Bookings, items that went out, and completed sales — the three counts the sheet used to be for.</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-56 animate-skeleton rounded-xl bg-slate-100" />
              ) : (
                <GroupedTrendChart rows={monthly} />
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2" padding="md">
            <CardHeader>
              <CardTitle>Occasion mix</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Staff pick this at the counter when they take the booking. Tickets with no pick show as Unspecified.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={bookings?.by_institution || []} empty="No bookings yet." money />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Packages</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Which bundle is earning. Item total means no package was used.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={bookings?.by_package || []} pretty={false} empty="No package mix yet." money />
            </CardContent>
          </Card>
          <Card padding="md">
            <CardHeader>
              <CardTitle>How money arrived</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Cash vs QRIS vs transfer. Reconcile the drawer against cash share.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={bookings?.by_payment || []} pretty={false} empty="No collections yet." money />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Sales mix</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Retail, clearance, and replacement. Clearance is how idle suits become cash.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={sales?.by_line_type || []} empty="No sales yet." money />
            </CardContent>
          </Card>
          <Card padding="md">
            <CardHeader>
              <CardTitle>By type</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Where to keep depth in the rack.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={stock?.by_type || []} empty="No type mix yet." />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card padding="md">
            <CardHeader>
              <CardTitle>Sizes that move</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Buy these sizes first.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={stock?.by_size || []} empty="No size data yet." />
            </CardContent>
          </Card>
          <Card padding="md">
            <CardHeader>
              <CardTitle>Colours that move</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Unusual colours that never appear here should wait.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={stock?.by_color || []} empty="No colour data yet." />
            </CardContent>
          </Card>
        </div>

        {viewingAll && (stock?.by_branch?.length || 0) > 1 && (
          <Card padding="md">
            <CardHeader>
              <CardTitle>By branch</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Transfer idle pieces toward the shop that is moving them.</p>
            </CardHeader>
            <CardContent>
              <ShareBars rows={stock?.by_branch || []} pretty={false} empty="No branch split." />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Hottest rentals</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Protect these.</p>
                </div>
                <Badge variant="primary">{formatNumber(moved)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ItemTable
                rows={stock?.top_items || []}
                emptyTitle="No movers yet"
                emptyDetail="Complete a rental pickup to start the ranking."
              />
            </CardContent>
          </Card>
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Idle catalogue</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Sell, transfer, or stop buying.</p>
                </div>
                <Link href="/dashboard/items" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Items →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ItemTable
                rows={stock?.idle_items || []}
                idle
                emptyTitle="Everything moved"
                emptyDetail="No idle rentable pieces in this period."
              />
            </CardContent>
          </Card>
          <Card padding="md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Top sold</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Retail and clearance.</p>
                </div>
                <Link href="/dashboard/sales" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                  Sales →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ItemTable
                rows={sales?.top_items || []}
                emptyTitle="No sales yet"
                emptyDetail="Walk-in and clearance sales will rank here."
              />
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}

function mergeMonthly(report: OwnerAnalytics | null) {
  const map = new Map<string, { period: string; bookings: number; items_out: number; sales: number }>();
  const add = (period: string) => {
    const key = monthKey(period);
    const existing = map.get(key);
    if (existing) return existing;
    const row = { period, bookings: 0, items_out: 0, sales: 0 };
    map.set(key, row);
    return row;
  };
  report?.bookings?.monthly?.forEach((row) => {
    add(row.period).bookings = row.bookings;
  });
  report?.stock?.monthly?.forEach((row) => {
    add(row.period).items_out = row.items_out;
  });
  report?.sales?.monthly?.forEach((row) => {
    add(row.period).sales = row.rentals;
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, row]) => row);
}

function monthKey(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function InsightList({ insights }: { insights: RentalInsight[] }) {
  if (insights.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-10 w-10" />}
        title="No advice yet"
        description="Once bookings or rentals land in this period, stocking recommendations appear here."
      />
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {insights.map((insight) => {
        const tone = insightTone(insight.kind);
        return (
          <div key={insight.title} className={`rounded-2xl border px-4 py-4 ${tone.wrap}`}>
            <Badge variant={tone.badge} size="sm">
              {insightKindLabel(insight.kind)}
            </Badge>
            <h3 className="mt-2 text-sm font-semibold text-slate-900">{insight.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{insight.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function GroupedTrendChart({
  rows,
}: {
  rows: Array<{ period: string; bookings: number; items_out: number; sales: number }>;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-8 w-8" />}
        title="No monthly trend"
        description="Bookings, rentals, and sales in this range will plot here."
      />
    );
  }
  const max = Math.max(1, ...rows.map((row) => Math.max(row.bookings || 0, row.items_out || 0, row.sales || 0)));
  const width = Math.max(360, rows.length * 88);
  const height = 220;
  const padL = 28;
  const padB = 36;
  const padT = 12;
  const innerW = width - padL - 12;
  const innerH = height - padT - padB;
  const groupW = innerW / rows.length;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-full h-56" role="img" aria-label="Monthly bookings, items out, and sales">
        {rows.map((row, i) => {
          const x = padL + i * groupW;
          const bookedH = ((row.bookings || 0) / max) * innerH;
          const outH = ((row.items_out || 0) / max) * innerH;
          const saleH = ((row.sales || 0) / max) * innerH;
          const barW = Math.min(14, groupW * 0.22);
          const gap = 3;
          const start = x + (groupW - barW * 3 - gap * 2) / 2;
          return (
            <g key={row.period}>
              <rect x={start} y={padT + innerH - bookedH} width={barW} height={bookedH} rx="4" fill="#34d399" />
              <rect x={start + barW + gap} y={padT + innerH - outH} width={barW} height={outH} rx="4" fill="#6366f1" />
              <rect x={start + (barW + gap) * 2} y={padT + innerH - saleH} width={barW} height={saleH} rx="4" fill="#f59e0b" />
              <text x={x + groupW / 2} y={height - 14} textAnchor="middle" className="fill-slate-500" fontSize="11">
                {monthLabel(row.period)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> Bookings</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Went out</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Sales</span>
      </div>
    </div>
  );
}

function ShareBars({
  rows,
  empty,
  pretty = true,
  money = false,
}: {
  rows: RentalItemAnalytics['by_type'];
  empty: string;
  pretty?: boolean;
  money?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{empty}</p>;
  }
  const max = Math.max(1, ...rows.map((row) => (money ? row.revenue : row.items_out)));
  return (
    <div className="space-y-3">
      {rows.slice(0, 8).map((row) => (
        <div key={row.key}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-800">{pretty ? facetLabel(row.label) : row.label}</span>
            <span className="tabular-nums text-slate-500">
              {money ? formatCurrency(row.revenue || 0) : formatNumber(row.items_out)} · {Math.round((row.share || 0) * 100)}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.max(4, ((money ? row.revenue : row.items_out) / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemTable({
  rows,
  idle,
  emptyTitle,
  emptyDetail,
}: {
  rows: RentalItemAnalytics['top_items'];
  idle?: boolean;
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (rows.length === 0) {
    return <EmptyState icon={<Shirt className="h-8 w-8" />} title={emptyTitle} description={emptyDetail} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-400">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 font-medium">Size</th>
            <th className="pb-2 font-medium text-right">{idle ? 'Status' : 'Times'}</th>
            {!idle && <th className="pb-2 font-medium text-right">Value</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="py-2.5 pr-3">
                <Link href={`/dashboard/items/${row.id}`} className="font-medium text-slate-900 hover:text-indigo-700">
                  {row.name}
                </Link>
                <div className="text-xs text-slate-500">
                  {row.code}
                  {row.color ? ` · ${row.color}` : ''}
                  {row.type ? ` · ${facetLabel(row.type)}` : ''}
                </div>
              </td>
              <td className="py-2.5 text-slate-600">{row.size_label || '—'}</td>
              <td className="py-2.5 text-right">
                {idle ? (
                  <Badge variant="warning" className="capitalize">{row.status || 'idle'}</Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-slate-900">
                    {formatNumber(row.items_out)}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                  </span>
                )}
              </td>
              {!idle && (
                <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
                  {formatCurrency(row.revenue || 0)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
