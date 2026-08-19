'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { BarChart3, Download, ExternalLink, Lock, RefreshCcw } from 'lucide-react';

import { MetricTile, PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import {
  Badge,
  CollapsibleCard,
  EmptyState,
  GroupedList,
  ListGroup,
  ListRow,
  SkeletonRow,
} from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { groupRows } from '@/lib/group-rows';
import { AccountingReports } from '@/components/admin/AccountingReports';
import type {
  Booking,
  ClosedMonth,
  GoogleSheetsStatus,
  GoogleSyncRun,
  ProfitAndLossReport,
  ProfitAndLossRow,
} from '@/types';
import { BOOKING_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';

const MONTHS = [
  { value: 1, short: 'Jan', label: 'January' },
  { value: 2, short: 'Feb', label: 'February' },
  { value: 3, short: 'Mar', label: 'March' },
  { value: 4, short: 'Apr', label: 'April' },
  { value: 5, short: 'May', label: 'May' },
  { value: 6, short: 'Jun', label: 'June' },
  { value: 7, short: 'Jul', label: 'July' },
  { value: 8, short: 'Aug', label: 'August' },
  { value: 9, short: 'Sep', label: 'September' },
  { value: 10, short: 'Oct', label: 'October' },
  { value: 11, short: 'Nov', label: 'November' },
  { value: 12, short: 'Dec', label: 'December' },
];

/** Track which groups a reader has opened, keyed by group. */
function useOpenGroups(keys: string[]) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return {
    open,
    toggle,
    expandAll: () => setOpen(new Set(keys)),
    collapseAll: () => setOpen(new Set()),
  };
}

function bookingStatusTone(status: Booking['status']) {
  if (status === 'completed') return 'success' as const;
  if (status === 'cancelled') return 'danger' as const;
  if (status === 'active' || status === 'confirmed') return 'primary' as const;
  return 'default' as const;
}

/**
 * The P&L money columns, defined once.
 *
 * The wide table on a laptop and the folded month rows on a phone read from this
 * same list, so the two views cannot drift apart or show a different order.
 */
const PNL_COLUMNS: Array<{
  key: keyof ProfitAndLossRow;
  label: string;
  /** Colours a profit green and a loss red. */
  signed?: boolean;
}> = [
  { key: 'booking_revenue', label: 'Bookings' },
  { key: 'sale_revenue', label: 'Sales' },
  { key: 'total_revenue', label: 'Revenue' },
  { key: 'cost_of_goods_sold', label: 'COGS' },
  { key: 'gross_profit', label: 'Gross profit' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'net_profit', label: 'Net profit', signed: true },
];

function pnlAmount(row: ProfitAndLossRow, key: keyof ProfitAndLossRow): number {
  const value = row[key];
  return typeof value === 'number' ? value : 0;
}

function signedToneClass(amount: number) {
  return amount >= 0 ? 'text-emerald-700' : 'text-red-700';
}

/** `2026-03-01T00:00:00Z` reads as `2026-03`; anything unparseable stays as sent. */
function periodLabelOf(period: string): string {
  const date = new Date(period);
  if (Number.isNaN(date.getTime())) return period;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** A month chip. 44 px tall so a thumb can hit it on the shop phone. */
function monthChipClass(active: boolean) {
  return [
    'inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium touch-manipulation transition-colors',
    active
      ? 'bg-indigo-600 text-white'
      : 'border border-black/10 bg-white/70 text-slate-700 hover:bg-white',
  ].join(' ');
}

export default function FinancialReportPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { currentBranch, viewingAll, branches } = useBranch();

  const isAdmin = user?.role === 'admin';

  const today = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>(today.getMonth() + 1);

  const initialMonth = today.getMonth() + 1;
  const [startDate, setStartDate] = useState<string>(`${currentYear}-${String(initialMonth).padStart(2, '0')}-01`);
  const [endDate, setEndDate] = useState<string>(() => {
    const lastDay = new Date(currentYear, initialMonth, 0).getDate();
    return `${currentYear}-${String(initialMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingStatus, setBookingStatus] = useState<string>('');
  const [bookingPaymentStatus, setBookingPaymentStatus] = useState<string>('');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<string>('');
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetStatus, setSheetStatus] = useState<GoogleSheetsStatus | null>(null);
  const [exportRuns, setExportRuns] = useState<GoogleSyncRun[]>([]);
  const [retryingRunId, setRetryingRunId] = useState<string | null>(null);
  const [pnl, setPnl] = useState<ProfitAndLossReport | null>(null);
  const [pnlLoading, setPnlLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [closedMonths, setClosedMonths] = useState<ClosedMonth[]>([]);
  const [lockingMonth, setLockingMonth] = useState(false);

  const bookingTotals = useMemo(() => {
    return bookings.reduce(
      (acc, b) => {
        acc.count += 1;
        acc.total += Number(b.total_amount || 0);
        acc.discount += Number(b.discount_amount || 0);
        acc.final += Number((b.total_amount || 0) - (b.discount_amount || 0));
        acc.paid += Number(b.paid_amount || 0);
        acc.remaining += Number(b.remaining_amount || 0);
        return acc;
      },
      { count: 0, total: 0, discount: 0, final: 0, paid: 0, remaining: 0 }
    );
  }, [bookings]);

  /**
   * The bookings folded into one group per month, newest month first.
   *
   * The group header carries the count and the money the old month table showed,
   * and the group opens onto the bookings behind those numbers.
   */
  const bookingMonths = useMemo(
    () =>
      groupRows(bookings, {
        keyOf: (booking) => {
          const date = new Date(booking.booking_date);
          return Number.isNaN(date.getTime())
            ? 'unknown'
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        },
        titleOf: (key) => (key === 'unknown' ? 'No booking date' : key),
        valueOf: (booking) => Number(booking.total_amount || 0) - Number(booking.discount_amount || 0),
      }).sort((a, b) => b.key.localeCompare(a.key)),
    [bookings],
  );
  const bookingMonthsOpen = useOpenGroups(bookingMonths.map((group) => group.key));

  const getErrorMessage = (e: unknown): string => {
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object') {
      const maybeAxios = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
      return maybeAxios.response?.data?.error || maybeAxios.response?.data?.message || maybeAxios.message || 'Unknown error';
    }
    return 'Unknown error';
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return; // DashboardLayout already redirects to login
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  // Keep date range derived from year/month selection
  useEffect(() => {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    if (selectedMonth === 'all') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
      return;
    }

    const month = selectedMonth;
    const start = `${selectedYear}-${pad2(month)}-01`;
    const lastDay = new Date(selectedYear, month, 0).getDate(); // month is 1-based, JS Date wants next month index
    const end = `${selectedYear}-${pad2(month)}-${pad2(lastDay)}`;
    setStartDate(start);
    setEndDate(end);
  }, [selectedYear, selectedMonth]);

  const periodLabel = useMemo(() => {
    if (selectedMonth === 'all') return `All of ${selectedYear}`;
    const month = MONTHS.find((m) => m.value === selectedMonth);
    return `${month?.label || selectedMonth} ${selectedYear}`;
  }, [selectedYear, selectedMonth]);

  const isMonthClosed = (year: number, month: number) =>
    closedMonths.some((row) => row.year === year && row.month === month);

  const selectedMonthClosed = selectedMonth !== 'all' && isMonthClosed(selectedYear, selectedMonth);

  /**
   * What the folded export section says about itself.
   *
   * A failed run is the only reason to open the section, so a failure shows in
   * red on the header instead of waiting inside a table.
   */
  const exportSummary = useMemo(() => {
    if (exportRuns.length === 0) return <span className="text-xs text-slate-500">No runs yet</span>;
    const failed = exportRuns.filter((run) => run.status === 'failed').length;
    const latest = exportRuns[0];
    return (
      <Badge variant={failed > 0 ? 'danger' : 'success'}>
        {failed > 0 ? `${failed} failed` : `${latest.period_key} ${latest.status}`}
      </Badge>
    );
  }, [exportRuns]);

  /** Jump the whole page to one month, from a P&L row. */
  const openPnlMonth = (period: string) => {
    const date = new Date(period);
    if (Number.isNaN(date.getTime())) return;
    setSelectedYear(date.getFullYear());
    setSelectedMonth(date.getMonth() + 1);
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getFinancialReportBookings({
        startDate,
        endDate,
        status: bookingStatus || undefined,
        paymentStatus: bookingPaymentStatus || undefined,
        paymentMethod: bookingPaymentMethod || undefined,
        search: bookingSearch || undefined,
      });
      setBookings(data.bookings || []);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to load bookings list');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitAndLoss = async () => {
    setPnlLoading(true);
    try {
      const report = await apiClient.getProfitAndLoss({
        startDate,
        endDate,
        groupBy: 'month',
      });
      setPnl(report);
    } catch {
      setPnl(null);
    } finally {
      setPnlLoading(false);
    }
  };

  const downloadBookingsCSV = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await apiClient.downloadFinancialReportBookingsCSV({
        startDate,
        endDate,
        status: bookingStatus || undefined,
        paymentStatus: bookingPaymentStatus || undefined,
        paymentMethod: bookingPaymentMethod || undefined,
        search: bookingSearch || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-bookings-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to download bookings CSV');
    } finally {
      setLoading(false);
    }
  };

  const generateExcel = async () => {
    setExportingExcel(true);
    setError(null);
    try {
      const blob = await apiClient.downloadAccountingExcel({ startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suitlabs-${periodLabel.replace(/\s+/g, '-').toLowerCase()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to generate Excel');
    } finally {
      setExportingExcel(false);
    }
  };

  const loadClosedMonths = async () => {
    try {
      setClosedMonths(await apiClient.getClosedMonths());
    } catch {
      setClosedMonths([]);
    }
  };

  const toggleClosedMonth = async () => {
    if (selectedMonth === 'all') return;
    setLockingMonth(true);
    setError(null);
    try {
      if (selectedMonthClosed) {
        await apiClient.openMonth(selectedYear, selectedMonth);
      } else {
        await apiClient.closeMonth(selectedYear, selectedMonth);
      }
      await loadClosedMonths();
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to update month lock');
    } finally {
      setLockingMonth(false);
    }
  };

  const loadGoogleSheetExports = async () => {
    try {
      const [status, runs] = await Promise.all([
        apiClient.getGoogleSheetsStatus(),
        apiClient.getGoogleSheetsRuns('booking_export', viewingAll ? 24 : 12),
      ]);
      setSheetStatus(status);
      setExportRuns(runs);
    } catch {
      setSheetStatus(null);
      setExportRuns([]);
    }
  };

  const retryGoogleSheetExport = async (runId: string) => {
    setRetryingRunId(runId);
    setError(null);
    try {
      await apiClient.retryGoogleSheetsBookingExport(runId);
      await loadGoogleSheetExports();
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to retry Google Sheets export');
    } finally {
      setRetryingRunId(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchBookings();
    fetchProfitAndLoss();
    loadGoogleSheetExports();
    loadClosedMonths();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin, currentBranch?.id, viewingAll]);

  // Auto-refresh when filters/range change (debounced)
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const t = window.setTimeout(() => {
      fetchBookings();
      fetchProfitAndLoss();
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    isAdmin,
    startDate,
    endDate,
    bookingStatus,
    bookingPaymentStatus,
    bookingPaymentMethod,
    bookingSearch,
  ]);

  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <>
        <PageShell title="Financial Report" subtitle="Admin only">
          <Card>
            <CardContent>
              <EmptyState
                icon={<BarChart3 className="h-6 w-6" />}
                title="Access denied"
                description="This page is only available to administrators."
              />
            </CardContent>
          </Card>
        </PageShell>
      </>
    );
  }

  return (
    <>
      <PageShell title="Financial Report" subtitle={
        viewingAll
          ? `Company group — separate shop books, shown together. ${periodLabel}.`
          : `${currentBranch?.name || 'This shop'} only. ${periodLabel}.`
      }>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Report period</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Pick a month to see that month’s P&L, Balance Sheet, and Cash Flow, or choose the full year.
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedMonth !== 'all' && (
                    <Button variant="outline" loading={lockingMonth} onClick={toggleClosedMonth}>
                      <Lock className="h-4 w-4" />
                      {selectedMonthClosed ? 'Unlock month' : 'Lock month'}
                    </Button>
                  )}
                  <Button loading={exportingExcel} onClick={generateExcel}>
                    <Download className="h-4 w-4" />
                    Generate Excel
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input
                  label="Year"
                  type="number"
                  min={2000}
                  max={2100}
                  fullWidth={false}
                  className="w-28"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value || currentYear))}
                />
                {/* A locked month says so on its own chip, so the reader does not
                    have to select it to find out. */}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Report month">
                  <button
                    type="button"
                    aria-pressed={selectedMonth === 'all'}
                    className={monthChipClass(selectedMonth === 'all')}
                    onClick={() => setSelectedMonth('all')}
                  >
                    Full year
                  </button>
                  {MONTHS.map((month) => {
                    const closed = isMonthClosed(selectedYear, month.value);
                    return (
                      <button
                        key={month.value}
                        type="button"
                        aria-pressed={selectedMonth === month.value}
                        title={closed ? `${month.label} is locked` : month.label}
                        className={monthChipClass(selectedMonth === month.value)}
                        onClick={() => setSelectedMonth(month.value)}
                      >
                        {month.short}
                        {closed && <Lock aria-hidden className="ml-1 inline h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {startDate} → {endDate}
                {selectedMonthClosed ? ' · This month is locked. Journal Entries dated here cannot be added or changed.' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        <CollapsibleCard
          title="Monthly Google Sheets export"
          defaultOpen={false}
          subtitle={
            viewingAll
              ? 'Each shop writes last month\'s bookings to its own spreadsheet.'
              : `Previous-month bookings for ${currentBranch?.name || 'this shop'} are upserted automatically on the 1st in ${sheetStatus?.timezone || 'Asia/Makassar'}.`
          }
          summary={exportSummary}
          actions={
            <>
              {!viewingAll && sheetStatus?.spreadsheet_url && (
                <a href={sheetStatus.spreadsheet_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4" />
                    Open sheet
                  </Button>
                </a>
              )}
              <Button variant="secondary" size="sm" onClick={loadGoogleSheetExports}>
                <RefreshCcw className="h-4 w-4" />
                Refresh status
              </Button>
            </>
          }
        >
            <div className="space-y-4">
              <div className="text-xs text-slate-500">
                {viewingAll
                  ? `Monthly tabs: ${sheetStatus?.booking_tab_pattern || 'MMM YYYY'} (for example, JAN 2026)`
                  : sheetStatus?.configured
                    ? `Monthly tabs: ${sheetStatus.booking_tab_pattern} (for example, JAN 2026)`
                    : 'Set this shop\'s Google Sheet on Admin → Branches.'}
              </div>

              {viewingAll && (sheetStatus?.branches?.length || 0) > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(sheetStatus?.branches || []).map((shop) => (
                    <div key={shop.branch_id} className="flex items-center justify-between gap-2 rounded-xl ring-1 ring-black/5 bg-white/50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{shop.branch_name}</div>
                        <div className="text-xs text-slate-500">{shop.configured ? 'Sheet configured' : 'No spreadsheet'}</div>
                      </div>
                      {shop.spreadsheet_url && (
                        <a href={shop.spreadsheet_url} target="_blank" rel="noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4" />
                            Open
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {exportRuns.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/60">
                      <tr className="text-left text-slate-600">
                        <th className="px-4 py-3 font-semibold">Period</th>
                        {viewingAll && <th className="px-4 py-3 font-semibold">Shop</th>}
                        <th className="px-4 py-3 font-semibold">Sheet</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Rows</th>
                        <th className="px-4 py-3 font-semibold">Finished</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/30">
                      {exportRuns.map((run) => (
                        <tr key={run.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{run.period_key}</td>
                          {viewingAll && (
                            <td className="px-4 py-3 text-slate-700">
                              {branches.find((branch) => branch.id === run.branch_id)?.name
                                || sheetStatus?.branches?.find((shop) => shop.branch_id === run.branch_id)?.branch_name
                                || '—'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-slate-700">{run.sheet_name || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              run.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : run.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {run.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700">{run.row_count}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {run.finished_at ? new Date(run.finished_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {run.status === 'failed' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                loading={retryingRunId === run.id}
                                onClick={() => retryGoogleSheetExport(run.id)}
                              >
                                Retry
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                  No monthly export runs recorded yet.
                </div>
              )}
            </div>
        </CollapsibleCard>

        <CollapsibleCard
          title={`Profit & Loss ${viewingAll ? '(company group)' : currentBranch ? `· ${currentBranch.name}` : ''}`.trim()}
          subtitle={
            <>
              {viewingAll
                ? 'Each shop has its own P&L. The totals are the group; the shop rows come after.'
                : `${currentBranch?.name || 'The current shop'} only — not mixed with the other shop.`}
              {' '}Booking revenue without cancelled, plus completed sales, minus Cost of Goods Sold and recorded expenses. {periodLabel}.
              {selectedMonth === 'all' ? ' Open a month to jump the page to it.' : ''}
            </>
          }
          summary={
            <span
              className={clsx('text-sm font-semibold tabular-nums', signedToneClass(pnl?.totals?.net_profit || 0))}
              title={formatCurrency(pnl?.totals?.net_profit || 0)}
            >
              {formatCurrencyCompact(pnl?.totals?.net_profit || 0)}
            </span>
          }
        >
            <div className="space-y-4">

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricTile
                  label="Booking revenue"
                  value={formatCurrencyCompact(pnl?.totals?.booking_revenue || 0)}
                  title={formatCurrency(pnl?.totals?.booking_revenue || 0)}
                />
                <MetricTile
                  label="Sale revenue"
                  value={formatCurrencyCompact(pnl?.totals?.sale_revenue || 0)}
                  title={formatCurrency(pnl?.totals?.sale_revenue || 0)}
                />
                <MetricTile
                  label="Cost of Goods Sold"
                  value={formatCurrencyCompact(pnl?.totals?.cost_of_goods_sold || 0)}
                  title={formatCurrency(pnl?.totals?.cost_of_goods_sold || 0)}
                />
                <MetricTile
                  label="Expenses"
                  value={formatCurrencyCompact(pnl?.totals?.expenses || 0)}
                  title={formatCurrency(pnl?.totals?.expenses || 0)}
                />
                <MetricTile
                  label="Net profit"
                  value={formatCurrencyCompact(pnl?.totals?.net_profit || 0)}
                  title={formatCurrency(pnl?.totals?.net_profit || 0)}
                  valueClassName={(pnl?.totals?.net_profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}
                />
              </div>

              {viewingAll && (pnl?.by_branch?.length || 0) > 0 && (
                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/60">
                      <tr className="text-left text-slate-600">
                        <th className="px-4 py-3 font-semibold">Shop</th>
                        <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                        <th className="px-4 py-3 font-semibold text-right">Sales</th>
                        <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                        <th className="px-4 py-3 font-semibold text-right">COGS</th>
                        <th className="px-4 py-3 font-semibold text-right">Expenses</th>
                        <th className="px-4 py-3 font-semibold text-right">Net profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/30">
                      {pnl!.by_branch!.map((shop) => (
                        <tr key={shop.branch_id} className="text-slate-800">
                          <td className="px-4 py-3 font-medium">{shop.branch_name}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(shop.totals.booking_revenue)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(shop.totals.sale_revenue)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(shop.totals.total_revenue)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(shop.totals.cost_of_goods_sold || 0)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(shop.totals.expenses)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${shop.totals.net_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            {formatCurrency(shop.totals.net_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pnlLoading ? (
                <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/40">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : !pnl || pnl.rows.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                  No P&L rows for this range yet. Add expenses and completed bookings to see monthly profit.
                </div>
              ) : (
                <>
                  {/* Laptop: every month on one line, because an accountant reads
                      down a column. */}
                  <div className="hidden overflow-x-auto rounded-2xl border border-black/5 md:block">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/60">
                        <tr className="text-left text-slate-600">
                          <th className="px-4 py-3 font-semibold">Month</th>
                          {PNL_COLUMNS.map((column) => (
                            <th key={column.key} className="px-4 py-3 text-right font-semibold">{column.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 bg-white/30">
                        {pnl.rows.map((row) => (
                          <tr key={row.period} className="text-slate-800">
                            <td className="px-4 py-3 font-medium">
                              {selectedMonth === 'all' ? (
                                <button
                                  type="button"
                                  className="rounded-lg font-medium text-indigo-700 underline-offset-2 hover:underline"
                                  onClick={() => openPnlMonth(row.period)}
                                >
                                  {periodLabelOf(row.period)}
                                </button>
                              ) : (
                                periodLabelOf(row.period)
                              )}
                            </td>
                            {PNL_COLUMNS.map((column) => {
                              const amount = pnlAmount(row, column.key);
                              return (
                                <td
                                  key={column.key}
                                  className={clsx(
                                    'px-4 py-3 text-right tabular-nums',
                                    column.signed && `font-medium ${signedToneClass(amount)}`,
                                  )}
                                >
                                  {formatCurrency(amount)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-white/60">
                        <tr className="font-semibold text-slate-900">
                          <td className="px-4 py-3">TOTAL</td>
                          {PNL_COLUMNS.map((column) => {
                            const amount = pnlAmount(pnl.totals, column.key);
                            return (
                              <td
                                key={column.key}
                                className={clsx('px-4 py-3 text-right tabular-nums', column.signed && signedToneClass(amount))}
                              >
                                {formatCurrency(amount)}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Phone: one month per row, its lines underneath. The same
                      columns, with no sideways scrolling. */}
                  <div className="md:hidden">
                    <GroupedList label="Profit and loss by month">
                      {pnl.rows.map((row) => (
                        <ListGroup
                          key={row.period}
                          title={periodLabelOf(row.period)}
                          meta={`Revenue ${formatCurrencyCompact(pnlAmount(row, 'total_revenue'))} · Expenses ${formatCurrencyCompact(pnlAmount(row, 'expenses'))}`}
                          value={
                            <span className={signedToneClass(pnlAmount(row, 'net_profit'))}>
                              {formatCurrencyCompact(pnlAmount(row, 'net_profit'))}
                            </span>
                          }
                          valueTitle={formatCurrency(pnlAmount(row, 'net_profit'))}
                        >
                          {PNL_COLUMNS.map((column) => {
                            const amount = pnlAmount(row, column.key);
                            return (
                              <ListRow
                                key={column.key}
                                title={column.label}
                                value={
                                  <span className={column.signed ? signedToneClass(amount) : undefined}>
                                    {formatCurrency(amount)}
                                  </span>
                                }
                              />
                            );
                          })}
                          {selectedMonth === 'all' && (
                            <div className="px-3 py-2.5 sm:px-4">
                              <Button size="sm" variant="secondary" onClick={() => openPnlMonth(row.period)}>
                                Open this month
                              </Button>
                            </div>
                          )}
                        </ListGroup>
                      ))}
                      <ListGroup
                        title="TOTAL"
                        meta={periodLabel}
                        value={
                          <span className={signedToneClass(pnlAmount(pnl.totals, 'net_profit'))}>
                            {formatCurrencyCompact(pnlAmount(pnl.totals, 'net_profit'))}
                          </span>
                        }
                        valueTitle={formatCurrency(pnlAmount(pnl.totals, 'net_profit'))}
                      >
                        {PNL_COLUMNS.map((column) => {
                          const amount = pnlAmount(pnl.totals, column.key);
                          return (
                            <ListRow
                              key={column.key}
                              title={column.label}
                              value={
                                <span className={column.signed ? signedToneClass(amount) : undefined}>
                                  {formatCurrency(amount)}
                                </span>
                              }
                            />
                          );
                        })}
                      </ListGroup>
                    </GroupedList>
                  </div>
                </>
              )}
            </div>
        </CollapsibleCard>

        <AccountingReports
          startDate={startDate}
          endDate={endDate}
          periodLabel={periodLabel}
          shopLabel={viewingAll ? 'Company group' : currentBranch?.name}
        />

        <CollapsibleCard
          title="Bookings"
          defaultOpen={false}
          subtitle={`${periodLabel}. Change the month at the top of this page.`}
          summary={
            <span className="text-sm font-semibold tabular-nums text-slate-900" title={formatCurrency(bookingTotals.final)}>
              {bookingTotals.count} · {formatCurrencyCompact(bookingTotals.final)}
            </span>
          }
          actions={
            <>
              <Button variant="secondary" size="sm" loading={loading} onClick={fetchBookings}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
              <Button variant="primary" size="sm" loading={loading} onClick={downloadBookingsCSV}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </>
          }
        >
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricTile label="Total bookings" value={bookingTotals.count} />
                <MetricTile
                  label="Final revenue"
                  value={formatCurrencyCompact(bookingTotals.final)}
                  title={formatCurrency(bookingTotals.final)}
                />
                <MetricTile
                  label="Paid"
                  value={formatCurrencyCompact(bookingTotals.paid)}
                  title={formatCurrency(bookingTotals.paid)}
                />
                <MetricTile
                  label="Remaining"
                  value={formatCurrencyCompact(bookingTotals.remaining)}
                  title={formatCurrency(bookingTotals.remaining)}
                />
              </div>

              {/* Dashboard filters (affect summary + monthly view + export) */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Select
                  searchable={false}
                  label="Status"
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'pending', label: 'pending' },
                    { value: 'confirmed', label: 'confirmed' },
                    { value: 'active', label: 'active' },
                    { value: 'completed', label: 'completed' },
                    { value: 'cancelled', label: 'cancelled' },
                    { value: 'pending_approval', label: 'pending_approval' },
                  ]}
                />
                <Select
                  searchable={false}
                  label="Payment status"
                  value={bookingPaymentStatus}
                  onChange={(e) => setBookingPaymentStatus(e.target.value)}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'pending', label: 'pending' },
                    { value: 'partial', label: 'partial' },
                    { value: 'completed', label: 'completed' },
                    { value: 'refunded', label: 'refunded' },
                  ]}
                />
                <Select
                  searchable={false}
                  label="Payment method"
                  value={bookingPaymentMethod}
                  onChange={(e) => setBookingPaymentMethod(e.target.value)}
                  options={[
                    { value: '', label: 'All' },
                    ...BOOKING_PAYMENT_METHOD_OPTIONS,
                  ]}
                />

                <Input
                  label="Search"
                  type="search"
                  placeholder="Name, phone, email or invoice"
                  value={bookingSearch}
                  onChange={(e) => setBookingSearch(e.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Monthly grouped view (derived from the detailed report) */}
              {loading ? (
                <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/40">
                  {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
                </div>
              ) : bookingMonths.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-6 w-6" />}
                  title="No bookings"
                  description="No bookings match this period and these filters."
                />
              ) : (
                /* The month totals were the only thing on show before, with the
                   bookings behind them nowhere on the page. Each month now opens
                   onto the bookings it counted. */
                <GroupedList
                  label="Bookings by month"
                  groupCount={bookingMonths.length}
                  openCount={bookingMonthsOpen.open.size}
                  onExpandAll={bookingMonthsOpen.expandAll}
                  onCollapseAll={bookingMonthsOpen.collapseAll}
                >
                  {bookingMonths.map((group) => {
                    const paid = group.rows.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0);
                    const remaining = group.rows.reduce((sum, b) => sum + Number(b.remaining_amount || 0), 0);
                    return (
                      <ListGroup
                        key={group.key}
                        title={group.title}
                        meta={`${group.rows.length} booking${group.rows.length === 1 ? '' : 's'} · paid ${formatCurrencyCompact(paid)} · remaining ${formatCurrencyCompact(remaining)}`}
                        value={formatCurrencyCompact(group.value)}
                        valueTitle={`Final ${formatCurrency(group.value)}`}
                        open={bookingMonthsOpen.open.has(group.key)}
                        onToggle={() => bookingMonthsOpen.toggle(group.key)}
                      >
                        {group.rows.map((booking) => {
                          const final = Number(booking.total_amount || 0) - Number(booking.discount_amount || 0);
                          const customer = booking.customer
                            ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
                            : 'Walk-in';
                          return (
                            <ListRow
                              key={booking.id}
                              muted={booking.status === 'cancelled'}
                              title={customer}
                              subtitle={`${booking.invoice_number || booking.id.slice(-8).toUpperCase()} · ${formatDateShort(booking.booking_date)}`}
                              meta={
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <Badge variant={bookingStatusTone(booking.status)}>{booking.status}</Badge>
                                  <span>paid {formatCurrency(Number(booking.paid_amount || 0))}</span>
                                  {Number(booking.remaining_amount || 0) > 0 && (
                                    <>
                                      <span aria-hidden>·</span>
                                      <span>remaining {formatCurrency(Number(booking.remaining_amount || 0))}</span>
                                    </>
                                  )}
                                </span>
                              }
                              value={formatCurrency(final)}
                            />
                          );
                        })}
                      </ListGroup>
                    );
                  })}
                  <ListGroup
                    title="TOTAL"
                    meta={`${bookingTotals.count} bookings · paid ${formatCurrencyCompact(bookingTotals.paid)} · remaining ${formatCurrencyCompact(bookingTotals.remaining)}`}
                    value={formatCurrencyCompact(bookingTotals.final)}
                    valueTitle={`Final ${formatCurrency(bookingTotals.final)}`}
                  >
                    <ListRow title="Total before discount" value={formatCurrency(bookingTotals.total)} />
                    <ListRow title="Discount" value={formatCurrency(bookingTotals.discount)} />
                    <ListRow title="Final" value={formatCurrency(bookingTotals.final)} />
                    <ListRow title="Paid" value={formatCurrency(bookingTotals.paid)} />
                    <ListRow title="Remaining" value={formatCurrency(bookingTotals.remaining)} />
                  </ListGroup>
                </GroupedList>
              )}
            </div>
        </CollapsibleCard>
      </PageShell>
    </>
  );
}

