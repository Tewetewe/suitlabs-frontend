'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState, FilterBar, InfiniteScrollSentinel, SkeletonRow } from '@/components/ui/DataDisplay';
import { SaleComposer } from '@/components/sales/SaleComposer';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDateTime } from '@/lib/date';
import { formatPaymentMethod } from '@/lib/payment-methods';
import { CreateSaleRequest, Rental, Sale, SaleSource } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { SaleInvoiceModal } from '@/components/modals/SaleInvoiceModal';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBag } from 'lucide-react';
import { hasNextPage, LIST_PAGE_SIZE, useInfiniteList } from '@/hooks/useInfiniteList';

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
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState<SaleSource | ''>('');
  const [linkedRental, setLinkedRental] = useState<Rental | null>(null);
  const [cancellingSale, setCancellingSale] = useState<Sale | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [saleInvoice, setSaleInvoice] = useState<Sale | null>(null);
  const bookingId = searchParams?.get('booking_id') || undefined;
  const rentalId = searchParams?.get('rental_id') || undefined;
  const customerId = searchParams?.get('customer_id') || undefined;

  const loadSalesPage = useCallback(async (page: number) => {
    try {
      const response = await apiClient.getSales({
        search: search || undefined,
        source: source || undefined,
        page,
        limit: LIST_PAGE_SIZE,
      });
      const items = response.data?.data?.sales || [];
      const pagination = response.data?.pagination;
      return { items, hasMore: hasNextPage(pagination, items.length), total: pagination?.total || 0 };
    } catch {
      error('Unable to load sales', 'Please try again.');
      return { items: [] as Sale[], hasMore: false, total: 0 };
    }
  }, [search, source, error]);

  const {
    items: sales,
    loading,
    loadingMore,
    hasMore,
    total,
    reload,
    sentinelRef,
  } = useInfiniteList(loadSalesPage);

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
      setSaleInvoice(sale);
      await reload();
    } catch (e) {
      error('Sale failed', e instanceof Error ? e.message : 'Please check stock and try again.');
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancellingSale) return;
    try {
      setCancelling(true);
      await apiClient.cancelSale(cancellingSale.id);
      success('Sale cancelled', cancellingSale.sale_number);
      setCancellingSale(null);
      await reload();
    } catch (e) {
      error('Cancel failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
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
            searchable={false}
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
              <Card key={sale.id} padding="sm">
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{sale.sale_number}</span>
                      <Badge variant={sale.status === 'completed' ? 'success' : 'danger'} dot className="capitalize">{sale.status}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {[
                        sale.customer ? `${sale.customer.first_name} ${sale.customer.last_name}` : 'Walk-in',
                        sourceLabel(sale.source),
                        sale.payment_method ? formatPaymentMethod(sale.payment_method) : '',
                        sale.branch?.name,
                        formatDateTime(sale.created_at),
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {(sale.items || []).length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {(sale.items || []).map((line) => line.item?.name || 'Item').join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(sale.total_amount)}</div>
                      {isAdmin && (
                        <div className="text-[11px] text-slate-400">
                          Cost {formatCurrency((sale.items || []).reduce((sum, line) => sum + line.quantity * (line.unit_cost || 0), 0))}
                        </div>
                      )}
                    </div>
                    {sale.status === 'completed' && (
                      <Button variant="ghost" size="sm" onClick={() => setCancellingSale(sale)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={hasMore}
          loaded={sales.length}
          total={total}
        />
      </div>
    </PageShell>
    <ConfirmModal
      isOpen={!!cancellingSale}
      title="Cancel sale"
      description={cancellingSale ? `Cancel ${cancellingSale.sale_number}? Stock will be restored.` : undefined}
      confirmLabel="Cancel sale"
      variant="danger"
      loading={cancelling}
      onClose={() => setCancellingSale(null)}
      onConfirm={handleCancel}
    />
    <SaleInvoiceModal
      isOpen={!!saleInvoice}
      sale={saleInvoice}
      onClose={() => setSaleInvoice(null)}
    />
    </>
  );
}

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading sales…</div>}>
      <SalesPageInner />
    </Suspense>
  );
}
