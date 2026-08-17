'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Download, ExternalLink, Lock, RefreshCcw } from 'lucide-react';

import { MetricTile, PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { AccountingReports } from '@/components/admin/AccountingReports';
import type { Booking, ClosedMonth, GoogleSheetsStatus, GoogleSyncRun, ProfitAndLossReport } from '@/types';
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

  const monthly = useMemo(() => {
    const map = new Map<string, { period: string; bookings: number; final: number; paid: number; remaining: number }>();
    for (const b of bookings) {
      const d = new Date(b.booking_date);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = map.get(key) || { period: key, bookings: 0, final: 0, paid: 0, remaining: 0 };
      existing.bookings += 1;
      existing.final += Number((b.total_amount || 0) - (b.discount_amount || 0));
      existing.paid += Number(b.paid_amount || 0);
      existing.remaining += Number(b.remaining_amount || 0);
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [bookings]);

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
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  className="w-24 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value || currentYear))}
                />
                <button
                  type="button"
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                    selectedMonth === 'all' ? 'bg-indigo-600 text-white' : 'bg-white/70 text-slate-700 border border-black/10'
                  }`}
                  onClick={() => setSelectedMonth('all')}
                >
                  Full year
                </button>
                {MONTHS.map((month) => (
                  <button
                    key={month.value}
                    type="button"
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                      selectedMonth === month.value ? 'bg-indigo-600 text-white' : 'bg-white/70 text-slate-700 border border-black/10'
                    }`}
                    onClick={() => setSelectedMonth(month.value)}
                  >
                    {month.short}
                    {isMonthClosed(selectedYear, month.value) ? ' · locked' : ''}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-500">
                {startDate} → {endDate}
                {selectedMonthClosed ? ' · This month is locked. Journal Entries dated here cannot be added or changed.' : ''}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-900">Monthly Google Sheets export</div>
                  <div className="mt-1 text-sm text-slate-600">
                    {viewingAll
                      ? 'Each shop writes last month\'s bookings to its own spreadsheet. Totals below are all shops; the table is per shop.'
                      : `Previous-month bookings for ${currentBranch?.name || 'this shop'} are upserted automatically on the 1st in ${sheetStatus?.timezone || 'Asia/Makassar'}.`}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {viewingAll
                      ? `Monthly tabs: ${sheetStatus?.booking_tab_pattern || 'MMM YYYY'} (for example, JAN 2026)`
                      : sheetStatus?.configured
                        ? `Monthly tabs: ${sheetStatus.booking_tab_pattern} (for example, JAN 2026)`
                        : 'Set this shop\'s Google Sheet on Admin → Branches.'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!viewingAll && sheetStatus?.spreadsheet_url && (
                    <a href={sheetStatus.spreadsheet_url} target="_blank" rel="noreferrer">
                      <Button variant="outline">
                        <ExternalLink className="h-4 w-4" />
                        Open sheet
                      </Button>
                    </a>
                  )}
                  <Button variant="secondary" onClick={loadGoogleSheetExports}>
                    <RefreshCcw className="h-4 w-4" />
                    Refresh status
                  </Button>
                </div>
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
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-slate-900">Profit & Loss {viewingAll ? '(company group)' : currentBranch ? `· ${currentBranch.name}` : ''}</div>
                <div className="mt-1 text-sm text-slate-600">
                  {viewingAll
                    ? 'Each shop has its own P&L. Totals below are the group; the table after that is per shop.'
                    : `This report is ${currentBranch?.name || 'the current shop'} only — not mixed with the other shop.`}
                  {' '}Booking revenue (excluding cancelled) plus completed sales, minus Cost of Goods Sold and recorded expenses. {periodLabel}.
                  {selectedMonth === 'all' ? ' Click a month row to open that month.' : ''}
                </div>
              </div>

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
                <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">Loading P&L...</div>
              ) : !pnl || pnl.rows.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                  No P&L rows for this range yet. Add expenses and completed bookings to see monthly profit.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/60">
                      <tr className="text-left text-slate-600">
                        <th className="px-4 py-3 font-semibold">Month</th>
                        <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                        <th className="px-4 py-3 font-semibold text-right">Sales</th>
                        <th className="px-4 py-3 font-semibold text-right">Revenue</th>
                        <th className="px-4 py-3 font-semibold text-right">COGS</th>
                        <th className="px-4 py-3 font-semibold text-right">Gross profit</th>
                        <th className="px-4 py-3 font-semibold text-right">Expenses</th>
                        <th className="px-4 py-3 font-semibold text-right">Net profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/30">
                      {pnl.rows.map((row) => {
                        const period = new Date(row.period);
                        const label = Number.isNaN(period.getTime())
                          ? row.period
                          : `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
                        return (
                          <tr
                            key={row.period}
                            className={`text-slate-800 ${selectedMonth === 'all' ? 'cursor-pointer hover:bg-indigo-50/70' : ''}`}
                            onClick={() => {
                              if (selectedMonth === 'all' && !Number.isNaN(period.getTime())) {
                                setSelectedYear(period.getFullYear());
                                setSelectedMonth(period.getMonth() + 1);
                              }
                            }}
                          >
                            <td className="px-4 py-3 font-medium">{label}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.booking_revenue)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.sale_revenue)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.total_revenue)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.cost_of_goods_sold || 0)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.gross_profit || 0)}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(row.expenses)}</td>
                            <td className={`px-4 py-3 text-right font-medium ${row.net_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                              {formatCurrency(row.net_profit)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-white/60">
                      <tr className="font-semibold text-slate-900">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pnl.totals.booking_revenue)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pnl.totals.sale_revenue)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pnl.totals.total_revenue)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pnl.totals.cost_of_goods_sold || 0)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pnl.totals.gross_profit || 0)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pnl.totals.expenses)}</td>
                        <td className={`px-4 py-3 text-right ${pnl.totals.net_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          {formatCurrency(pnl.totals.net_profit)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <AccountingReports
          startDate={startDate}
          endDate={endDate}
          periodLabel={periodLabel}
          shopLabel={viewingAll ? 'Company group' : currentBranch?.name}
        />

        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Summary cards */}
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  Booking list for {periodLabel}. Change the month at the top of this page.
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    loading={loading}
                    onClick={async () => {
                      await fetchBookings();
                    }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Refresh
                  </Button>
                  <Button variant="primary" loading={loading} onClick={downloadBookingsCSV}>
                    <Download className="h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
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

                <label className="block">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Search</div>
                  <input
                    className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                    placeholder="Name / phone / email / invoice..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Monthly grouped view (derived from the detailed report) */}
              {monthly.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-6 w-6" />}
                  title="No data"
                  description="No bookings found for the selected range."
                />
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/60">
                      <tr className="text-left text-slate-600">
                        <th className="px-4 py-3 font-semibold">Month</th>
                        <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                        <th className="px-4 py-3 font-semibold text-right">Final</th>
                        <th className="px-4 py-3 font-semibold text-right">Paid</th>
                        <th className="px-4 py-3 font-semibold text-right">Remaining</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/30">
                      {monthly.map((m) => (
                        <tr key={m.period} className="text-slate-800">
                          <td className="px-4 py-3 font-medium">{m.period}</td>
                          <td className="px-4 py-3 text-right">{m.bookings}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(m.final)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(m.paid)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(m.remaining)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-white/60">
                      <tr className="font-semibold text-slate-900">
                        <td className="px-4 py-3">TOTAL</td>
                        <td className="px-4 py-3 text-right">{bookingTotals.count}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(bookingTotals.final)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(bookingTotals.paid)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(bookingTotals.remaining)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageShell>
    </>
  );
}

