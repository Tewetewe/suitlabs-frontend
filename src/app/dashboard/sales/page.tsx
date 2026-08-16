'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState, FilterBar, SkeletonRow } from '@/components/ui/DataDisplay';
import { SaleComposer } from '@/components/sales/SaleComposer';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { formatPaymentMethod } from '@/lib/payment-methods';
import { CreateSaleRequest, Rental, Sale, SaleSource } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag } from 'lucide-react';
import { BranchBadge } from '@/components/branch/BranchBadge';

function sourceLabel(source: SaleSource) {
  switch (source) {
    case 'booking_addon':
      return 'Booking add-on';
    case 'rental_return':
      return 'Return / lost item';
    default:
      return 'Walk-in';
  }
}

function SalesPageInner() {
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<SaleSource | ''>('');
  const [linkedRental, setLinkedRental] = useState<Rental | null>(null);
  const bookingId = searchParams?.get('booking_id') || undefined;
  const rentalId = searchParams?.get('rental_id') || undefined;
  const customerId = searchParams?.get('customer_id') || undefined;

  const loadSales = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getSales({
        search: search || undefined,
        source: source || undefined,
        page: 1,
        limit: 30,
      });
      setSales(response.data?.data?.sales || []);
    } catch {
      error('Unable to load sales', 'Please try again.');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [search, source, error]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  useEffect(() => {
    if (!rentalId) {
      setLinkedRental(null);
      return;
    }
    let cancelled = false;
    apiClient.getRental(rentalId).then((rental) => {
      if (!cancelled) setLinkedRental(rental);
    }).catch(() => {
      if (!cancelled) setLinkedRental(null);
    });
    return () => {
      cancelled = true;
    };
  }, [rentalId]);

  const handleCreate = async (payload: CreateSaleRequest) => {
    try {
      setSubmitting(true);
      const sale = await apiClient.createSale(payload);
      success('Sale recorded', sale.sale_number);
      await loadSales();
    } catch (e) {
      error('Sale failed', e instanceof Error ? e.message : 'Please check stock and try again.');
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (sale: Sale) => {
    if (!confirm(`Cancel ${sale.sale_number}? Stock will be restored.`)) return;
    try {
      await apiClient.cancelSale(sale.id);
      success('Sale cancelled', sale.sale_number);
      await loadSales();
    } catch (e) {
      error('Cancel failed', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <PageShell
      title="Sales"
      subtitle="Walk-in retail, booking add-ons, and return fees. Use Cashier on tablet for the fastest checkout."
      action={
        <Link href="/dashboard/cashier">
          <Button size="md">Open Cashier</Button>
        </Link>
      }
    >
      {(bookingId || rentalId) && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          {rentalId
            ? 'Recording add-ons / lost items for this rental. Do this before marking the rental complete.'
            : 'Recording a booking add-on sale.'}
        </div>
      )}

      <SaleComposer
        bookingId={bookingId}
        rentalId={rentalId}
        customerId={customerId || linkedRental?.user_id}
        rentalItems={linkedRental?.items || []}
        submitting={submitting}
        onSubmit={handleCreate}
      />

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Recent sales</h2>
        <FilterBar>
          <Input
            placeholder="Search sale number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            value={source}
            onChange={(e) => setSource(e.target.value as SaleSource | '')}
            options={[
              { value: '', label: 'All sources' },
              { value: 'standalone', label: 'Walk-in' },
              { value: 'booking_addon', label: 'Booking add-on' },
              { value: 'rental_return', label: 'Return / lost item' },
            ]}
          />
        </FilterBar>

        {loading ? (
          <SkeletonRow />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="h-10 w-10" />}
            title="No sales yet"
            description="Record a walk-in sale or mark an item as sellable first."
          />
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <Card key={sale.id}>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{sale.sale_number}</span>
                      <Badge variant={sale.status === 'completed' ? 'success' : 'danger'}>{sale.status}</Badge>
                      <BranchBadge branch={sale.branch} />
                      <Badge variant="default">{sourceLabel(sale.source)}</Badge>
                      {sale.payment_method && (
                        <Badge variant="default">{formatPaymentMethod(sale.payment_method)}</Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Walk-in'}
                      {sale.customer?.branch?.name ? ` · ${sale.customer.branch.name}` : ''}
                      {' · '}
                      {formatDateTime(sale.created_at)}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {(sale.items || []).map((line) => line.item?.name || 'Item').join(', ')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{formatCurrency(sale.total_amount)}</div>
                      {isAdmin && (
                        <div className="text-xs text-slate-500">
                          Buying {formatCurrency((sale.items || []).reduce((sum, line) => sum + line.quantity * (line.unit_cost || 0), 0))}
                        </div>
                      )}
                    </div>
                    {sale.status === 'completed' && (
                      <Button variant="ghost" size="sm" onClick={() => handleCancel(sale)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

export default function SalesPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="text-sm text-slate-500">Loading sales…</div>}>
        <SalesPageInner />
      </Suspense>
    </DashboardLayout>
  );
}
