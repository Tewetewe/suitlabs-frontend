'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Banknote,
  Calendar,
  Check,
  CreditCard,
  Landmark,
  Minus,
  Package,
  Plus,
  QrCode,
  RotateCcw,
  Search,
  Shirt,
  ShoppingBag,
  Trash2,
  UserPlus,
  Wallet,
  X,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import AutoCompleteSelect, { AutoPageResult } from '@/components/ui/AutoCompleteSelect';
import SimpleModal from '@/components/modals/SimpleModal';
import { BookingInvoiceModal } from '@/components/modals/BookingInvoiceModal';
import { SaleInvoiceModal } from '@/components/modals/SaleInvoiceModal';
import { useCashierChrome } from '@/components/cashier/CashierChromeContext';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { customerOptionLabel } from '@/lib/branch-scope';
import { BOOKING_OCCASION_OPTIONS, facetLabel } from '@/lib/select-options';
import { issueBookingInvoice } from '@/lib/issue-invoice';
import { cleanScannedCode, looksLikeInvoiceBarcode } from '@/lib/barcode';
import {
  BookingInstitution,
  BookingPaymentMethod,
  CreateBookingRequest,
  CreateSaleRequest,
  Customer,
  InvoiceData,
  Item,
  PackagePricing,
  Sale,
  SaleLineType,
  SalePaymentMethod,
} from '@/types';

const BarcodeScanner = dynamic(() => import('@/components/ui/BarcodeScanner'), {
  ssr: false,
});

type PosMode = 'rental' | 'sale';
type PayChannel = SalePaymentMethod;
type PayCoverage = 'dp' | 'full';

type CartLine = {
  key: string;
  item: Item;
  quantity: number;
  unit_price: number;
  is_addon?: boolean;
};

type DoneReceipt = {
  title: string;
  subtitle: string;
  amount: number;
};

const PAY_CHANNELS: Array<{ value: PayChannel; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
  { value: 'transfer', label: 'Transfer', icon: Landmark },
  { value: 'debit', label: 'Debit', icon: Wallet },
  { value: 'cc', label: 'Card', icon: CreditCard },
];

const PAGE_SIZE = 24;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function shortDate(iso: string) {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function catalogPrice(item: Item, mode: PosMode) {
  if (mode === 'sale') return item.selling_price || item.standard_price || item.one_day_price || 0;
  return item.standard_price || item.one_day_price || 0;
}

function stockQty(item: Item) {
  return item.available_qty ?? item.quantity ?? 0;
}

function canSell(item: Item, mode: PosMode) {
  if (mode === 'sale') return !!item.is_sellable && stockQty(item) > 0;
  return item.status === 'available' && stockQty(item) > 0;
}

function toBookingPayment(coverage: PayCoverage, channel: PayChannel): BookingPaymentMethod {
  return `${coverage}_${channel}` as BookingPaymentMethod;
}

export function CashierPOS() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const { chrome } = useCashierChrome();
  const router = useRouter();
  const isPhone = chrome === 'phone';

  const [mode, setMode] = useState<PosMode>('rental');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [type, setType] = useState('');
  const [typeOptions, setTypeOptions] = useState<Array<{ value: string; label: string }>>([
    { value: '', label: 'All types' },
  ]);
  const [rentalDate, setRentalDate] = useState(todayISO);
  const [returnDate, setReturnDate] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingMoreRef = useRef(false);
  const catalogRequestRef = useRef(0);
  const customersByIdRef = useRef<Map<string, Customer>>(new Map());

  const [cart, setCart] = useState<CartLine[]>([]);
  const [packages, setPackages] = useState<PackagePricing[]>([]);
  const [packageId, setPackageId] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payChannel, setPayChannel] = useState<PayChannel>('cash');
  const [payCoverage, setPayCoverage] = useState<PayCoverage>('dp');
  const [paidInput, setPaidInput] = useState('');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [guarantee, setGuarantee] = useState('KTP');
  const [occasion, setOccasion] = useState<BookingInstitution>('wedding');
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ first_name: '', last_name: '', phone: '', instagram: '', tiktok: '' });
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [done, setDone] = useState<DoneReceipt | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [saleInvoice, setSaleInvoice] = useState<Sale | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const selectedPackage = packages.find((pkg) => pkg.id === packageId);
  const subtotal = cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const packagePrice = selectedPackage?.price || 0;
  const addonTotal = cart
    .filter((line) => line.is_addon)
    .reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const discountAmount = Number(discount) || 0;
  const gross = mode === 'rental' && packagePrice > 0 ? packagePrice + addonTotal : subtotal;
  const total = Math.max(0, gross - (mode === 'rental' && packagePrice > 0 ? 0 : discountAmount));
  const paidAmount = mode === 'rental' && payCoverage === 'full' ? total : Number(paidInput) || 0;
  const remaining = Math.max(0, total - paidAmount);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const loadItems = useCallback(async (nextPage: number, append: boolean) => {
    if (append) {
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      catalogRequestRef.current += 1;
      setLoading(true);
    }
    const requestId = catalogRequestRef.current;
    try {
      const filters = {
        search: debouncedSearch || undefined,
        type: type || undefined,
        page: nextPage,
        limit: PAGE_SIZE,
        ...(mode === 'sale' ? { is_sellable: true } : {}),
      };
      const response =
        mode === 'rental' && rentalDate && returnDate
          ? await apiClient.getAvailableItemsCombined({
              ...filters,
              start_date: rentalDate,
              end_date: returnDate,
            })
          : await apiClient.getItems(filters);
      if (requestId !== catalogRequestRef.current) return;
      const next = response.data?.data?.items || [];
      const pagination = response.data?.pagination;
      setItems((prev) => {
        if (!append) return next;
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...next.filter((item) => !seen.has(item.id))];
      });
      setTotalPages(pagination?.total_pages || 1);
      setTotalItems(pagination?.total || next.length);
      setPage(nextPage);
    } catch {
      if (requestId !== catalogRequestRef.current) return;
      if (!append) {
        setItems([]);
        setTotalPages(1);
        setTotalItems(0);
      }
      error('Catalogue failed', 'Could not load items. Check the connection and try again.');
    } finally {
      if (requestId === catalogRequestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [debouncedSearch, type, mode, rentalDate, returnDate, error]);

  useEffect(() => {
    void loadItems(1, false);
  }, [loadItems]);

  useEffect(() => {
    const root = catalogRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (page >= totalPages) return;
        void loadItems(page + 1, true);
      },
      { root, rootMargin: '240px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadItems, loading, page, totalPages]);

  useEffect(() => {
    apiClient.getPackagePricing().then((rows) => {
      setPackages(rows.filter((row) => row.is_active));
    }).catch(() => setPackages([]));
    apiClient.getItemFacets().then((facets) => {
      setTypeOptions([
        { value: '', label: 'All types' },
        ...facets.types.map((value) => ({ value, label: facetLabel(value) })),
      ]);
    }).catch(() => undefined);
  }, []);

  const fetchCustomerPage = useCallback(async (query: string, nextPage: number): Promise<AutoPageResult> => {
    try {
      const res = await apiClient.getCustomers({
        search: query || undefined,
        page: nextPage,
        limit: 20,
        is_active: true,
      });
      const rows = res?.data?.data?.customers || [];
      for (const row of rows) customersByIdRef.current.set(row.id, row);
      return {
        options: rows.map((row) => ({
          value: row.id,
          label: customerOptionLabel(row),
        })),
        hasMore: Boolean(res?.data?.pagination?.has_next),
      };
    } catch {
      return { options: [], hasMore: false };
    }
  }, []);

  const handlePickCustomer = async (id: string) => {
    if (!id) {
      setCustomer(null);
      return;
    }
    const cached = customersByIdRef.current.get(id);
    if (cached?.first_name) {
      setCustomer(cached);
      return;
    }
    try {
      const row = await apiClient.getCustomer(id);
      if (!row?.id) {
        error('Customer not found', 'Try searching again.');
        return;
      }
      setCustomer(row);
    } catch {
      error('Customer not found', 'Try searching again.');
    }
  };

  const addItem = useCallback((item: Item) => {
    if (!canSell(item, mode) && mode === 'sale') {
      error('Not sellable', `${item.name} is not marked as sellable or is out of stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          key: `${item.id}-${Date.now()}`,
          item,
          quantity: 1,
          unit_price: catalogPrice(item, mode),
          is_addon: false,
        },
      ];
    });
    setFlashId(item.id);
    window.setTimeout(() => setFlashId(null), 450);
  }, [mode, error]);

  const setQty = (key: string, quantity: number) => {
    if (quantity < 1) {
      setCart((prev) => prev.filter((line) => line.key !== key));
      return;
    }
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, quantity } : line)));
  };

  const toggleAddon = (key: string) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, is_addon: !line.is_addon } : line)));
  };

  const resetTicket = () => {
    setCart([]);
    setCustomer(null);
    setPackageId('');
    setPaidInput('');
    setDiscount('');
    setNotes('');
    setPayCoverage('dp');
    setPayChannel('cash');
    setGuarantee('KTP');
    setCartOpen(false);
    setDone(null);
    setInvoiceData(null);
    setSaleInvoice(null);
  };

  const openBookingFromInvoice = async (code: string) => {
    const booking = await apiClient.getBookingByInvoice(code);
    const name = booking.customer
      ? `${booking.customer.first_name} ${booking.customer.last_name}`.trim()
      : booking.full_name || booking.invoice_number || 'Booking';
    const q = encodeURIComponent(booking.invoice_number || code);
    const rentalStatus = booking.rental?.status;
    if (booking.rental_id && rentalStatus !== 'completed' && rentalStatus !== 'cancelled') {
      router.push(`/dashboard/rentals?q=${q}`);
    } else {
      router.push(`/dashboard/bookings?q=${q}`);
    }
    success('Invoice found', name);
  };

  const handleBarcode = async (code: string) => {
    setScannerOpen(false);
    const cleaned = cleanScannedCode(code);
    if (looksLikeInvoiceBarcode(cleaned)) {
      try {
        await openBookingFromInvoice(cleaned);
      } catch {
        error('Not found', `No booking for invoice ${cleaned}`);
      }
      return;
    }
    try {
      const item = await apiClient.searchByBarcode(cleaned);
      addItem(item);
      success('Scanned', item.name);
    } catch {
      setSearch(cleaned);
      error('Not found', `No item for barcode ${cleaned}`);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.first_name.trim() || !newCustomer.phone.trim()) {
      error('Customer incomplete', 'First name and phone are required.');
      return;
    }
    try {
      setCreatingCustomer(true);
      const created = await apiClient.findOrCreateCustomer({
        first_name: newCustomer.first_name.trim(),
        last_name: newCustomer.last_name.trim(),
        phone: newCustomer.phone.trim(),
        instagram: newCustomer.instagram.trim() || undefined,
        tiktok: newCustomer.tiktok.trim() || undefined,
      });
      if (created?.id) customersByIdRef.current.set(created.id, created);
      setCustomer(created);
      setNewCustomerOpen(false);
      setNewCustomer({ first_name: '', last_name: '', phone: '', instagram: '', tiktok: '' });
      success('Customer ready', `${created.first_name} ${created.last_name}`);
    } catch (e) {
      error('Could not save customer', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleCharge = async () => {
    if (cart.length === 0) return;
    if (mode === 'rental' && !customer) {
      error('Customer required', 'Pick or add a customer before charging a rental.');
      setCartOpen(true);
      return;
    }
    if (mode === 'rental' && !rentalDate) {
      error('Date required', 'Set the rental date.');
      return;
    }
    if (mode === 'rental' && !occasion) {
      error('Occasion required', 'Pick why they are renting — wedding, school, corporate.');
      setCartOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'sale') {
        const payload: CreateSaleRequest = {
          customer_id: customer?.id,
          source: 'standalone',
          discount_amount: discountAmount,
          paid_amount: total,
          payment_method: payChannel,
          notes,
          items: cart.map((line) => ({
            item_id: line.item.id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            line_type: (line.item.type === 'suit' || line.item.type === 'jacket' ? 'clearance' : 'retail') as SaleLineType,
          })),
        };
        const sale = await apiClient.createSale(payload);
        setDone({
          title: 'Sale complete',
          subtitle: sale.sale_number,
          amount: total,
        });
        setSaleInvoice(sale);
        success('Sale recorded', sale.sale_number);
      } else {
        const paymentStatus = paidAmount <= 0 ? 'pending' : paidAmount >= total ? 'completed' : 'partial';
        const payload = {
          customer_id: customer!.id,
          booking_date: new Date(rentalDate).toISOString(),
          appointment_date: returnDate ? new Date(returnDate).toISOString() : undefined,
          booking_guarantee: guarantee,
          institution: occasion,
          notes,
          status: paidAmount > 0 ? 'confirmed' : 'pending',
          payment_status: paymentStatus,
          payment_method: toBookingPayment(payCoverage, payChannel),
          package_pricing_id: packageId || undefined,
          ...(packageId ? {} : { total_amount: gross }),
          paid_amount: paidAmount,
          discount_amount: packageId ? 0 : discountAmount,
          remaining_amount: remaining,
          created_by: user?.id,
          items: cart.map((line) => ({
            item_id: line.item.id,
            quantity: line.quantity,
            unit_price: line.unit_price,
            total_price: line.unit_price * line.quantity,
            discount_amount: 0,
            is_addon: !!packageId && !!line.is_addon,
          })),
        } as unknown as CreateBookingRequest;
        const booking = await apiClient.createBooking(payload);
        const bookingId = booking?.id;
        if (!bookingId) throw new Error('Booking was not created');
        setDone({
          title: 'Booking charged',
          subtitle: `Pickup is on Rentals · #${bookingId.slice(-8)}`,
          amount: paidAmount || total,
        });
        success('Booking created', 'Rental is waiting for pickup');
        if (paidAmount > 0) {
          try {
            const invoice = await issueBookingInvoice({
              id: bookingId,
              payment_status: paymentStatus,
              paid_amount: paidAmount,
            });
            if (invoice) setInvoiceData(invoice);
          } catch {
            error('Payment recorded, invoice failed', 'Print it from Bookings if the customer needs a copy.');
          }
        }
      }
      setCart([]);
      setCartOpen(false);
    } catch (e) {
      error(
        mode === 'sale' ? 'Sale failed' : 'Booking failed',
        e instanceof Error ? e.message : 'Check stock and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inCartIds = useMemo(() => new Set(cart.map((line) => line.item.id)), [cart]);

  const checkoutPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Ticket</div>
          <div className="text-xs text-slate-500">{cartCount} item{cartCount === 1 ? '' : 's'}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={resetTicket}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-white/70 touch-manipulation"
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className={clsx(
              'flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-white/70 touch-manipulation',
              !isPhone && 'lg:hidden'
            )}
            aria-label="Close ticket"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="cashier-scroll scroll-pad-keyboard min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Shirt className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">Tap a catalogue item to add it</p>
            <p className="mt-1 text-xs text-slate-500">Search, filter, or scan a barcode.</p>
          </div>
        ) : (
          cart.map((line) => (
            <div key={line.key} className="rounded-2xl glass-panel p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  <SafeImage
                    src={line.item.thumbnail_url}
                    alt={line.item.name}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                    fallback={<Package className="h-6 w-6 text-slate-400" />}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{line.item.name}</div>
                      <div className="text-xs text-slate-500">
                        {[line.item.code, line.item.size?.label ? `Size ${line.item.size.label}` : null].filter(Boolean).join(' · ') || 'Item'}
                      </div>
                      {mode === 'rental' && !!packageId && (
                        <button
                          type="button"
                          onClick={() => toggleAddon(line.key)}
                          className={clsx(
                            'mt-1 inline-flex min-h-8 items-center rounded-full px-2.5 text-[11px] font-semibold touch-manipulation',
                            line.is_addon
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {line.is_addon ? 'Add-on' : 'Included'}
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 touch-manipulation"
                      onClick={() => setCart((prev) => prev.filter((entry) => entry.key !== line.key))}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-lg active:bg-white touch-manipulation"
                        onClick={() => setQty(line.key, line.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                      <button
                        type="button"
                        className="flex h-11 w-11 items-center justify-center rounded-lg active:bg-white touch-manipulation"
                        onClick={() => setQty(line.key, line.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-sm font-semibold tabular-nums text-slate-900">
                      {mode === 'rental' && packageId && !line.is_addon
                        ? 'Included'
                        : formatCurrency(line.quantity * line.unit_price)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {mode === 'rental' && packages.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Package</div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip selected={!packageId} onClick={() => setPackageId('')}>Item total</Chip>
              {packages.map((pkg) => (
                <Chip key={pkg.id} selected={packageId === pkg.id} onClick={() => setPackageId(pkg.id)}>
                  {pkg.package_name}
                </Chip>
              ))}
            </div>
            {packageId && (
              <p className="mt-1 text-xs text-slate-500">Items are included in the package by default. Tap the badge to charge one as an add-on.</p>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</div>
            <button
              type="button"
              onClick={() => setNewCustomerOpen(true)}
              data-testid="pos-new-customer"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-indigo-700 touch-manipulation"
            >
              <UserPlus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
          {customer ? (
            <div className="flex items-center justify-between rounded-2xl glass-panel px-3 py-3" data-testid="pos-customer">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {customer.first_name} {customer.last_name}
                </div>
                <div className="mt-0.5"><BranchBadge branch={customer.branch} always /></div>
                <div className="text-xs text-slate-500">{customer.phone}</div>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-white/70 touch-manipulation"
                onClick={() => setCustomer(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <AutoCompleteSelect
              value=""
              onChange={handlePickCustomer}
              fetchPage={fetchCustomerPage}
              minQueryLength={0}
              placeholder="Search name or phone…"
            />
          )}
        </div>

        {mode === 'rental' && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Guarantee</div>
            <div className="flex flex-wrap gap-2">
              {['KTP', 'Passport', 'Student ID'].map((option) => (
                <Chip key={option} selected={guarantee === option} onClick={() => setGuarantee(option)}>
                  {option}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {mode === 'rental' && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Occasion</div>
            <div className="flex flex-wrap gap-2">
              {BOOKING_OCCASION_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  selected={occasion === option.value}
                  onClick={() => setOccasion(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {mode === 'rental' && (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Pay</div>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Chip selected={payCoverage === 'dp'} onClick={() => setPayCoverage('dp')} block testId="pos-pay-dp">DP</Chip>
              <Chip
                selected={payCoverage === 'full'}
                testId="pos-pay-full"
                onClick={() => {
                  setPayCoverage('full');
                  setPaidInput(String(total));
                }}
                block
              >
                Full
              </Chip>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Method</div>
          <div className="grid grid-cols-5 gap-1.5">
            {PAY_CHANNELS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                data-testid={`pos-pay-${value}`}
                onClick={() => setPayChannel(value)}
                className={clsx(
                  'flex min-h-14 flex-col items-center justify-center rounded-xl text-[11px] font-semibold touch-manipulation',
                  payChannel === value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'glass-control text-slate-600'
                )}
              >
                <Icon className="mb-0.5 h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'rental' && payCoverage === 'dp' && (
          <div>
            <CurrencyInput
              label="Down payment"
              value={paidInput}
              onChange={(n) => setPaidInput(n ? String(n) : '')}
            />
            <div className="mt-2 flex gap-2">
              <Chip onClick={() => setPaidInput('0')}>{formatCurrency(0)}</Chip>
              <Chip onClick={() => setPaidInput(String(Math.round(total / 2)))}>50%</Chip>
              <Chip onClick={() => { setPayCoverage('full'); setPaidInput(String(total)); }}>100%</Chip>
            </div>
          </div>
        )}

        {!(mode === 'rental' && packageId) && (
          <CurrencyInput
            label="Discount"
            value={discount}
            onChange={(n) => setDiscount(n ? String(n) : '')}
          />
        )}

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div className="shrink-0 border-t border-black/5 bg-white/50 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
        <div className="mb-3 space-y-1 text-sm">
          {mode === 'rental' && packagePrice > 0 ? (
            <>
              <div className="flex justify-between text-slate-500">
                <span>Package</span>
                <span className="tabular-nums">{formatCurrency(packagePrice)}</span>
              </div>
              {addonTotal > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Add-ons</span>
                  <span className="tabular-nums">{formatCurrency(addonTotal)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(gross)}</span>
            </div>
          )}
          {mode === 'rental' && (
            <div className="flex justify-between text-slate-500">
              <span>Remaining</span>
              <span className="tabular-nums">{formatCurrency(remaining)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>{mode === 'rental' && payCoverage === 'dp' ? 'To charge' : 'Total'}</span>
            <span className="tabular-nums">{formatCurrency(mode === 'rental' && payCoverage === 'dp' ? paidAmount : total)}</span>
          </div>
        </div>
        <Button
          size="xl"
          className="w-full min-h-14 text-base"
          onClick={handleCharge}
          disabled={submitting || cart.length === 0}
          loading={submitting}
          data-testid="pos-charge"
        >
          {mode === 'rental' ? 'Charge booking' : 'Complete sale'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="cashier-shell relative flex h-full min-h-0 flex-1 bg-transparent">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          className={clsx(
          'shrink-0 border-b border-black/5 bg-white/40 backdrop-blur-xl',
          isPhone ? 'space-y-2 px-3 py-2' : 'space-y-2 px-3 py-2 landscape:py-1.5'
          )}
          suppressHydrationWarning
        >
          <div className="flex gap-2">
            <div className={clsx('flex gap-2', isPhone ? 'w-full' : 'w-52 shrink-0')}>
              <ModeTab active={mode === 'rental'} onClick={() => { setMode('rental'); setCart([]); }} icon={Shirt} label="Rental" testId="pos-mode-rental" />
              <ModeTab active={mode === 'sale'} onClick={() => { setMode('sale'); setCart([]); }} icon={ShoppingBag} label="Sale" testId="pos-mode-sale" />
            </div>
            {!isPhone && (
              <>
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key !== 'Enter') return;
                      const cleaned = cleanScannedCode(search);
                      if (!looksLikeInvoiceBarcode(cleaned)) return;
                      e.preventDefault();
                      try {
                        await openBookingFromInvoice(cleaned);
                      } catch {
                        error('Not found', `No booking for invoice ${cleaned}`);
                      }
                    }}
                    placeholder="Find suit, size, color, code…"
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    className="h-11 w-full rounded-2xl glass-control pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
                    enterKeyHint="search"
                    inputMode="search"
                    suppressHydrationWarning
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 touch-manipulation"
                  aria-label="Scan barcode"
                  suppressHydrationWarning
                >
                  <QrCode className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {isPhone && (
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key !== 'Enter') return;
                    const cleaned = cleanScannedCode(search);
                    if (!looksLikeInvoiceBarcode(cleaned)) return;
                    e.preventDefault();
                    try {
                      await openBookingFromInvoice(cleaned);
                    } catch {
                      error('Not found', `No booking for invoice ${cleaned}`);
                    }
                  }}
                  placeholder="Find suit, size, color, code…"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="h-12 w-full rounded-2xl glass-control pl-10 pr-3 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40"
                  enterKeyHint="search"
                  inputMode="search"
                  suppressHydrationWarning
                />
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 touch-manipulation"
                aria-label="Scan barcode"
                suppressHydrationWarning
              >
                <QrCode className="h-5 w-5" />
              </button>
            </div>
          )}

          {mode === 'rental' && (
            isPhone && !datesOpen ? (
              <button
                type="button"
                onClick={() => setDatesOpen(true)}
                className="flex min-h-11 w-full items-center justify-between rounded-2xl glass-control px-3 text-left touch-manipulation"
                suppressHydrationWarning
              >
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {shortDate(rentalDate)} → {shortDate(returnDate)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            ) : (
              <div className={clsx('flex gap-2', !isPhone && 'items-stretch')}>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <label className="flex min-h-11 items-center gap-2 rounded-2xl glass-control px-3">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Rental</div>
                      <input
                        type="date"
                        value={rentalDate}
                        data-testid="pos-rental-date"
                        onChange={(e) => setRentalDate(e.target.value)}
                        className="w-full bg-transparent text-base text-slate-900 outline-none"
                      />
                    </div>
                  </label>
                  <label className="flex min-h-11 items-center gap-2 rounded-2xl glass-control px-3">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Return</div>
                      <input
                        type="date"
                        min={rentalDate || undefined}
                        value={returnDate}
                        data-testid="pos-return-date"
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="w-full bg-transparent text-base text-slate-900 outline-none"
                      />
                    </div>
                  </label>
                </div>
                {!isPhone && (
                  <div className="w-36 shrink-0">
                    <Select
                      options={typeOptions}
                      value={type}
                      searchable={false}
                      onChange={(e) => setType(e.target.value)}
                      searchPlaceholder="All types"
                      emptyMessage="No types found"
                    />
                  </div>
                )}
              </div>
            )
          )}

          {(isPhone || mode === 'sale') && (
            <Select
              options={typeOptions}
              value={type}
              searchable={false}
              onChange={(e) => setType(e.target.value)}
              searchPlaceholder="All types"
              emptyMessage="No types found"
            />
          )}
        </div>

        <div
          ref={catalogRef}
          className={clsx(
          'cashier-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4',
          isPhone ? 'pb-36 md:pb-28' : 'pb-28 lg:pb-4'
        )}>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-skeleton rounded-2xl glass-panel" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Package className="mb-2 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">No items match</p>
              <p className="mt-1 text-xs text-slate-500">Try another search, type, or date range.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const selected = inCartIds.has(item.id);
                  const available = canSell(item, mode) || mode === 'rental';
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="pos-item"
                      data-item-id={item.id}
                      onClick={() => addItem(item)}
                      className={clsx(
                        'group relative overflow-hidden rounded-2xl glass-panel text-left transition touch-manipulation active:scale-[0.98]',
                        selected && 'ring-2 ring-indigo-500',
                        flashId === item.id && 'ring-2 ring-emerald-500',
                        !available && mode === 'sale' && 'opacity-50'
                      )}
                    >
                      <div className="relative flex aspect-square items-center justify-center bg-slate-100">
                        <SafeImage
                          src={item.thumbnail_url}
                          alt={item.name}
                          width={320}
                          height={320}
                          className="h-full w-full object-cover"
                          fallback={<Package className="h-10 w-10 text-slate-300" />}
                        />
                        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                          {item.size?.label && (
                            <span className="rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                              {item.size.label}
                            </span>
                          )}
                        </div>
                        {selected && (
                          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white">
                            <Check className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5 p-2.5">
                        <div className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                          {item.name}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500">
                            {[item.code, item.size?.label].filter(Boolean).join(' · ') || item.color || item.brand}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-900">
                            {formatCurrency(catalogPrice(item, mode))}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div ref={sentinelRef} className="h-8" />
              <p className="mt-1 pb-2 text-center text-xs text-slate-500">
                {loadingMore ? 'Loading more…' : `${items.length} of ${totalItems}`}
              </p>
            </>
          )}
        </div>
      </section>

      <div
        className={clsx(
          'flex min-h-0 flex-col glass-panel-strong',
            isPhone
              ? cartOpen
                ? 'fixed inset-x-0 z-50 h-[min(85dvh,760px)] max-h-[var(--vv-height,100dvh)] rounded-t-3xl shadow-2xl bottom-[var(--keyboard-inset,0px)]'
                : 'hidden'
              : cartOpen
                ? 'fixed inset-x-0 z-40 h-[min(92dvh,920px)] max-h-[var(--vv-height,100dvh)] rounded-t-3xl shadow-2xl bottom-[var(--keyboard-inset,0px)] lg:static lg:z-auto lg:h-full lg:w-[min(42vw,420px)] lg:shrink-0 lg:rounded-none lg:border-l lg:border-black/10 lg:shadow-none lg:bottom-auto lg:max-h-none'
                : 'hidden lg:flex lg:h-full lg:w-[min(42vw,420px)] lg:shrink-0 lg:border-l lg:border-black/10'
        )}
      >
        {checkoutPanel}
      </div>

      {cartOpen && (
        <button
          type="button"
          className={clsx(
            'fixed inset-0',
            isPhone ? 'z-40 bg-white' : 'z-30 bg-black/40 lg:hidden',
          )}
          onClick={() => setCartOpen(false)}
          aria-label="Close ticket"
        />
      )}

      {!cartOpen && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className={clsx(
            'fixed z-30 flex min-h-14 items-center justify-between rounded-2xl bg-indigo-600 px-4 text-white shadow-xl shadow-indigo-600/20 touch-manipulation',
            isPhone
              ? 'keyboard-hide inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-3'
              : 'keyboard-hide inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden'
          )}
        >
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">
            {cartCount}
          </span>
          <span className="font-semibold">{cartCount === 0 ? 'Ticket is empty' : 'Review ticket'}</span>
          <span className="tabular-nums font-bold">{formatCurrency(total)}</span>
        </button>
      )}

      {done && !invoiceData && !saleInvoice && (
        <div
          className={clsx(
            'absolute inset-0 z-50 flex items-center justify-center p-6',
            isPhone ? 'bg-white' : 'bg-white/70 backdrop-blur-md',
          )}
          data-testid="pos-done"
        >
          <div className="w-full max-w-sm text-center glass-panel-strong rounded-2xl p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">{done.title}</h2>
            <p className="mt-1 text-sm text-slate-500" data-testid="pos-done-subtitle">{done.subtitle}</p>
            <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900">{formatCurrency(done.amount)}</p>
            <Button size="xl" className="mt-8 w-full min-h-14" onClick={resetTicket}>
              New transaction
            </Button>
          </div>
        </div>
      )}

      <SimpleModal
        isOpen={newCustomerOpen}
        title="New customer"
        onClose={() => setNewCustomerOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewCustomerOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCustomer} loading={creatingCustomer}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="First name"
            value={newCustomer.first_name}
            onChange={(e) => setNewCustomer((prev) => ({ ...prev, first_name: e.target.value }))}
          />
          <Input
            label="Last name"
            value={newCustomer.last_name}
            onChange={(e) => setNewCustomer((prev) => ({ ...prev, last_name: e.target.value }))}
          />
          <Input
            label="Phone"
            type="tel"
            inputMode="tel"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <Input
            label="Instagram (optional)"
            value={newCustomer.instagram}
            onChange={(e) => setNewCustomer((prev) => ({ ...prev, instagram: e.target.value }))}
            placeholder="@username"
          />
          <Input
            label="TikTok (optional)"
            value={newCustomer.tiktok}
            onChange={(e) => setNewCustomer((prev) => ({ ...prev, tiktok: e.target.value }))}
            placeholder="@username"
          />
        </div>
      </SimpleModal>

      <BarcodeScanner isOpen={scannerOpen} onScan={handleBarcode} onClose={() => setScannerOpen(false)} />
      <BookingInvoiceModal
        isOpen={!!invoiceData}
        invoice={invoiceData}
        onClose={() => setInvoiceData(null)}
      />
      <SaleInvoiceModal
        isOpen={!!saleInvoice}
        sale={saleInvoice}
        onClose={() => setSaleInvoice(null)}
      />
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon: Icon,
  label,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={clsx(
        'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-sm font-semibold touch-manipulation',
        active ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' : 'glass-control text-slate-600'
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Chip({
  selected,
  onClick,
  children,
  block,
  testId,
}: {
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  block?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={clsx(
        'min-h-11 shrink-0 rounded-full px-3.5 text-sm font-semibold touch-manipulation',
        block && 'w-full',
        selected
          ? 'bg-indigo-600 text-white'
          : 'glass-control text-slate-700'
      )}
    >
      {children}
    </button>
  );
}
