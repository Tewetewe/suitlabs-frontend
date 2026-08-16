'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { PageShell, StatGrid } from '@/components/ui/PageShell';
import { Badge } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { Booking, DashboardStats, AssetReport, AccountingReport, Rental } from '@/types';
import { Package, Users, Calendar, DollarSign, AlertTriangle, Wrench, ArrowRight, Wallet, TrendingUp, Landmark, Store } from 'lucide-react';

const quickActions = [
  { label: 'Open Cashier',  href: '/dashboard/cashier',  variant: 'primary'   as const, icon: Store },
  { label: 'New Booking',   href: '/dashboard/bookings', variant: 'secondary' as const, icon: Calendar },
  { label: 'New Sale',      href: '/dashboard/sales',    variant: 'secondary' as const, icon: DollarSign },
  { label: 'Add Expense',   href: '/dashboard/expenses', variant: 'secondary' as const, icon: Wallet },
];

type ActivityItem = {
  text: string;
  time: string;
  badge: 'success' | 'primary' | 'warning' | 'danger' | 'default';
};

function timeAgo(iso?: string) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = Math.max(0, Math.floor(diff / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.floor(hr / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [pnl, setPnl] = useState<AccountingReport | null>(null);
  const [assets, setAssets] = useState<AssetReport | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [s, bookingsRes, rentalsRes] = await Promise.allSettled([
          apiClient.getDashboardStats(),
          apiClient.getBookings({ page: 1, limit: 5 }),
          apiClient.getRentals({ page: 1, limit: 5 }),
        ]);

        if (s.status === 'fulfilled') setStats(s.value);

        if (isAdmin) {
          const now = new Date();
          const pad = (n: number) => String(n).padStart(2, '0');
          const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
          const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
          const end = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(lastDay)}`;
          try {
            setPnl(await apiClient.getAccountingReport({ startDate: start, endDate: end }));
          } catch {
            setPnl(null);
          }
          try {
            setAssets(await apiClient.getAssets());
          } catch {
            setAssets(null);
          }
        }

        const bookings: Booking[] =
          bookingsRes.status === 'fulfilled'
            ? (bookingsRes.value?.data?.data?.bookings || [])
            : [];

        const rentals: Rental[] =
          rentalsRes.status === 'fulfilled'
            ? (rentalsRes.value?.data?.data?.rentals || [])
            : [];

        const bookingActivity: Array<ActivityItem & { ts: number }> = bookings.map((b) => {
          const customerName = b.customer
            ? [b.customer.first_name, b.customer.last_name].filter(Boolean).join(' ').trim()
            : 'Customer';
          const idShort = b.id ? b.id.slice(-8) : '';
          const badge =
            b.payment_status === 'completed'
              ? 'primary'
              : b.status === 'confirmed'
                ? 'success'
                : b.status === 'cancelled'
                  ? 'danger'
                  : b.status === 'pending'
                    ? 'warning'
                    : 'default';
          const ts = new Date((b as unknown as { created_at?: string }).created_at || b.booking_date || '').getTime();
          return {
            text: `Booking #${idShort} • ${customerName} • ${b.status}`,
            time: timeAgo((b as unknown as { created_at?: string }).created_at || b.booking_date),
            badge,
            ts: Number.isNaN(ts) ? 0 : ts,
          };
        });

        const rentalActivity: Array<ActivityItem & { ts: number }> = rentals.map((r) => {
          const customerName = r.customer
            ? [r.customer.first_name, r.customer.last_name].filter(Boolean).join(' ').trim()
            : (r.booking?.customer
                ? [r.booking.customer.first_name, r.booking.customer.last_name].filter(Boolean).join(' ').trim()
                : 'Customer');
          const idShort = r.id ? r.id.slice(-8) : '';
          const badge =
            r.status === 'active'
              ? 'success'
              : r.status === 'pending'
                ? 'warning'
                : r.status === 'cancelled' || r.status === 'overdue'
                  ? 'danger'
                  : 'default';
          const ts = new Date((r as unknown as { created_at?: string }).created_at || r.rental_date || '').getTime();
          return {
            text: `Rental #${idShort} • ${customerName} • ${r.status}`,
            time: timeAgo((r as unknown as { created_at?: string }).created_at || r.rental_date),
            badge,
            ts: Number.isNaN(ts) ? 0 : ts,
          };
        });

        const merged = [...bookingActivity, ...rentalActivity]
          .sort((a, b) => b.ts - a.ts)
          .slice(0, 5)
          .map(({ ts: _ts, ...rest }) => rest);

        setActivity(merged);
      } finally {
        setLoading(false);
      }
    };
    load().catch(console.error);
  }, [isAdmin]);

  const statItems = [
    { label: 'Total Items',      key: 'totalItems'       as keyof DashboardStats, icon: <Package />,       iconBg: 'bg-indigo-50',  iconColor: 'text-indigo-600' },
    { label: 'Total Bookings',   key: 'totalBookings'    as keyof DashboardStats, icon: <Calendar />,      iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Active Rentals',   key: 'activeRentals'    as keyof DashboardStats, icon: <Users />,         iconBg: 'bg-sky-50',     iconColor: 'text-sky-600' },
    { label: "Today's Revenue",  key: 'todayRevenue'     as keyof DashboardStats, icon: <DollarSign />,    iconBg: 'bg-amber-50',   iconColor: 'text-amber-600', format: 'currency' },
    { label: 'Low Stock',        key: 'lowStockItems'    as keyof DashboardStats, icon: <AlertTriangle />, iconBg: 'bg-red-50',     iconColor: 'text-red-600' },
    { label: 'Maintenance',      key: 'maintenanceItems' as keyof DashboardStats, icon: <Wrench />,        iconBg: 'bg-orange-50',  iconColor: 'text-orange-600' },
  ];

  return (
    <DashboardLayout>
      <PageShell
        title={`Welcome back, ${user?.first_name ?? 'there'}`}
        subtitle="A quick snapshot of what matters today."
        action={
          <Link href="/dashboard/cashier">
            <Button size="md">
              <Store className="h-4 w-4" />
              Open Cashier
            </Button>
          </Link>
        }
      >
        {/* KPI Stats */}
        <StatGrid
          stats={statItems.map(s => ({
            label:    s.label,
            value:    loading
                        ? ''
                        : s.format === 'currency'
                          ? formatCurrency(stats?.[s.key] as number ?? 0)
                          : (stats?.[s.key] as number ?? 0).toLocaleString(),
            icon:      s.icon,
            iconBg:    s.iconBg,
            iconColor: s.iconColor,
            loading,
          }))}
        />

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>This month (accrual)</CardTitle>
                <Link href="/dashboard/admin/financial-report" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Full report →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <TrendingUp className="h-3.5 w-3.5" /> Revenue
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(pnl?.profit_and_loss?.totals?.total_revenue || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Wallet className="h-3.5 w-3.5" /> Expenses
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(pnl?.profit_and_loss?.totals?.expenses || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Net profit</div>
                  <div className={`mt-1 text-lg font-bold ${(pnl?.profit_and_loss?.totals?.net_profit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {loading ? '—' : formatCurrency(pnl?.profit_and_loss?.totals?.net_profit || 0)}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Cash on Hand</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(pnl?.cash_on_hand || 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Drawer {formatCurrency(pnl?.cash_drawer || 0)} · Bank {formatCurrency(pnl?.bank || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Accounts Receivable</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(pnl?.balance_sheet?.accounts_receivable || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Dividends this year</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(pnl?.year_dividends || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Shop assets</CardTitle>
                <Link href="/dashboard/admin/assets" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  Full list →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Landmark className="h-3.5 w-3.5" /> Total assets
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(assets?.total_value || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Inventory</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(assets?.inventory?.total_value || 0)}
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                  <div className="text-xs font-semibold text-slate-500">Fixed assets</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {loading ? '—' : formatCurrency(assets?.fixed?.total_value || 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Secondary row */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quickActions.map(({ label, href, icon: Icon }) => (
                  <Link key={label} href={href} className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-slate-50 group">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                        <Icon className="h-4 w-4 text-indigo-600" />
                      </span>
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Link href="/dashboard/bookings" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {(activity.length > 0 ? activity : []).map((item, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <p className="text-sm text-slate-600 flex-1">{item.text}</p>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={item.badge} dot>
                        {item.badge === 'success' ? 'Active' : item.badge === 'primary' ? 'Paid' : item.badge === 'warning' ? 'Pending' : item.badge === 'danger' ? 'Alert' : 'Update'}
                      </Badge>
                      <span className="text-xs text-slate-400">{item.time}</span>
                    </div>
                  </li>
                ))}
                {!loading && activity.length === 0 && (
                  <li className="text-sm text-slate-500">
                    No recent activity yet.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    </DashboardLayout>
  );
}
