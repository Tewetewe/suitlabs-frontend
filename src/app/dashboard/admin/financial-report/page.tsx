'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, Download, RefreshCcw } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import apiClient from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/currency';
import type { Booking } from '@/types';

export default function FinancialReportPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const isAdmin = user?.role === 'admin';

  const today = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => today.getFullYear(), [today]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // 1-12 or all year

  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-12-31`);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingStatus, setBookingStatus] = useState<string>('');
  const [bookingPaymentStatus, setBookingPaymentStatus] = useState<string>('');
  const [bookingPaymentMethod, setBookingPaymentMethod] = useState<string>('');
  const [bookingSearch, setBookingSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const maybeAxios = e as { response?: { data?: { message?: string } }; message?: string };
      return maybeAxios.response?.data?.message || maybeAxios.message || 'Unknown error';
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

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin]);

  // Auto-refresh when filters/range change (debounced)
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    const t = window.setTimeout(() => {
      fetchBookings();
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
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="text-center text-slate-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageShell title="Financial Report" subtitle="Realtime monthly report from bookings. Select a month or all year, filter, then download.">
        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Summary cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Total bookings</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{bookingTotals.count}</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Final revenue</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(bookingTotals.final)}</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Paid</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(bookingTotals.paid)}</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Remaining</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(bookingTotals.remaining)}</div>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Year</div>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value || currentYear))}
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Month</div>
                    <select
                      className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                      value={selectedMonth}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedMonth(v === 'all' ? 'all' : Number(v));
                      }}
                    >
                      <option value="all">All year</option>
                      <option value="1">January</option>
                      <option value="2">February</option>
                      <option value="3">March</option>
                      <option value="4">April</option>
                      <option value="5">May</option>
                      <option value="6">June</option>
                      <option value="7">July</option>
                      <option value="8">August</option>
                      <option value="9">September</option>
                      <option value="10">October</option>
                      <option value="11">November</option>
                      <option value="12">December</option>
                    </select>
                  </label>
                  <label className="block">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Range</div>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                      value={`${startDate} → ${endDate}`}
                      readOnly
                    />
                  </label>
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
                <label className="block">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Status</div>
                  <select
                    className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="active">active</option>
                    <option value="completed">completed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="pending_approval">pending_approval</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Payment status</div>
                  <select
                    className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                    value={bookingPaymentStatus}
                    onChange={(e) => setBookingPaymentStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="pending">pending</option>
                    <option value="partial">partial</option>
                    <option value="completed">completed</option>
                    <option value="refunded">refunded</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-xs font-semibold text-slate-600 mb-1">Payment method</div>
                  <input
                    className="w-full rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm"
                    placeholder="e.g. full_transfer"
                    value={bookingPaymentMethod}
                    onChange={(e) => setBookingPaymentMethod(e.target.value)}
                  />
                </label>

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
    </DashboardLayout>
  );
}

