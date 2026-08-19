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
import { QrCode, ShoppingBag } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cleanScannedCode, looksLikeInvoiceBarcode, looksLikeSaleBarcode } from '@/lib/barcode';
import { hasNextPage, LIST_PAGE_SIZE, useInfiniteList } from '@/hooks/useInfiniteList';

const BarcodeScanner = dynamic(() => import('@/components/ui/BarcodeScanner'), { ssr: false });

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

/** How many units this sale took out of stock as lost. */
function lostUnits(sale: Sale): number {
  return (sale.items || [])
    .filter((line) => line.line_type === 'replacement')
    .reduce((sum, line) => sum + line.quantity, 0);
}

function customerName(rental: Rental): string {
  if (!rental.customer) return 'Customer';
  return `${rental.customer.first_name} ${rental.customer.last_name}`.trim();
}

/**
 * The lines of a sale in one phrase.
 *
 * A lost item is counted apart from the rest: it is the line that took stock out
 * of the shop, and the one a manager looks for when reading the day's sales.
 */
function lineSummary(sale: Sale): string {
  const lines = sale.items || [];
  const lost = lines.filter((line) => line.line_type === 'replacement');
  const sold = lines.filter((line) => line.line_type !== 'replacement');
  const parts: string[] = [];
  if (sold.length > 0) {
    parts.push(sold.map((line) => line.item?.name || 'Item').join(', '));
  }
  if (lost.length > 0) {
    const names = lost.map((line) => line.replacement_for_item?.name || line.item?.name || 'Item').join(', ');
    parts.push(`lost: ${names}`);
  }
  return parts.join(' · ');
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
  /** Bumped after a sale so the composer remounts empty. */
  const [composerKey, setComposerKey] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
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
      setComposerKey((key) => key + 1);
      await reload();
    } catch (e) {
      error('Sale failed', e instanceof Error ? e.message : 'Please check stock and try again.');
      throw e;
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Open the Sale behind a scanned or typed receipt code.
   *
   * A Sale receipt has carried a barcode for a while with nothing able to read it
   * back, so staff retyped the number to reprint a slip. A booking invoice starts
   * with INV and belongs to another screen, so say so rather than fail.
   */
  const resolveReceiptCode = async (raw: string) => {
    const cleaned = cleanScannedCode(raw);
    if (!cleaned) return;
    if (looksLikeInvoiceBarcode(cleaned)) {
      error('That is a booking invoice', 'Scan it on Bookings or in Cashier.');
      return;
    }
    if (!looksLikeSaleBarcode(cleaned)) {
      setSearch(cleaned);
      error('Not a receipt barcode', 'Scan the barcode on a sale receipt.');
      return;
    }
    setLookingUp(true);
    try {
      const sale = await apiClient.getSaleByBarcode(cleaned);
      setSaleInvoice(sale);
      success('Sale found', sale.sale_number);
    } catch {
      setSearch(cleaned);
      error('Not found', `No sale for ${cleaned}`);
    } finally {
      setLookingUp(false);
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
      {/* Three jobs share this screen. The header says which one is running and
          against what, so nobody records a return fee on the wrong rental. */}
      {(bookingId || rentalId) && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
          <div className="font-semibold">
            {rentalId ? 'Rental return: add-ons and lost items' : 'Booking add-on'}
          </div>
          <p className="mt-0.5 text-indigo-800">
            {rentalId
              ? linkedRental
                ? `${customerName(linkedRental)} · rental ${linkedRental.id.slice(-8).toUpperCase()} · ${linkedRental.status}. Record this before the rental is completed.`
                : 'Loading the rental…'
              : 'Charged on top of the booking, on its own sale invoice.'}
          </p>
        </div>
      )}

      <SaleComposer
        key={composerKey}
        bookingId={bookingId}
        rentalId={rentalId}
        customerId={customerId || linkedRental?.user_id}
        rentalItems={linkedRental?.items || []}
        rentalStatus={linkedRental?.status}
        submitLabel={rentalId ? 'Charge and record' : 'Complete sale'}
        submitting={submitting}
        onSubmit={handleCreate}
      />

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-800">Recent sales</h2>
        <FilterBar>
          <Input
            placeholder="Search or scan sale number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || lookingUp) return;
              if (!looksLikeSaleBarcode(search)) return;
              e.preventDefault();
              void resolveReceiptCode(search);
            }}
          />
          <Button
            type="button"
            aria-label="Scan a sale receipt"
            title="Scan a sale receipt"
            className="h-11 w-11 shrink-0 px-0"
            loading={lookingUp}
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="h-5 w-5" />
          </Button>
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
          <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/40">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
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
                      {lostUnits(sale) > 0 && (
                        <Badge variant="warning">{lostUnits(sale)} lost</Badge>
                      )}
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
                        {lineSummary(sale)}
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
    <BarcodeScanner
      isOpen={scannerOpen}
      onClose={() => setScannerOpen(false)}
      onScan={(code) => {
        setScannerOpen(false);
        void resolveReceiptCode(code);
      }}
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
