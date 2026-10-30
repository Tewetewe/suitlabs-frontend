'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  Calendar,
  Check,
  HandCoins,
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
  X,
  ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { hasNextPage } from '@/hooks/useInfiniteList';
import { formatCurrency } from '@/lib/currency';
import { TRANSACTION_FEE_LABEL, isQrisMethod, transactionFee } from '@/lib/transaction-fee';
import { useTransactionFeeRules } from '@/hooks/useTransactionFeeRules';
import { useDepositSettings } from '@/hooks/useDepositSettings';
import { POT_MISSING_MESSAGE, potForRequest, potMissing } from '@/lib/pots';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { RENTAL_LENGTHS, type RentalLength, missingFourHourPrice, rentalPrice, rentalWindow } from '@/lib/rental-window';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { SafeImage } from '@/components/ui/SafeImage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import AutoCompleteSelect, { AutoPageResult } from '@/components/ui/AutoCompleteSelect';
import NewCustomerModal from '@/components/modals/NewCustomerModal';
import { ProofPick } from '@/components/payments/ProofPick';
import { TransactionFeeLines } from '@/components/payments/TransactionFeeLines';
import { PaymentMethodPicker } from '@/components/payments/PaymentMethodPicker';
import { BookingInvoiceModal } from '@/components/modals/BookingInvoiceModal';
import { SaleInvoiceModal } from '@/components/modals/SaleInvoiceModal';
import { useCashierChrome } from '@/components/cashier/CashierChromeContext';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { customerOptionLabel } from '@/lib/branch-scope';
import { BOOKING_GUARANTEE_OPTIONS, BOOKING_OCCASION_OPTIONS, customerLanguageLabel, facetLabel } from '@/lib/select-options';
import { issueBookingInvoice } from '@/lib/issue-invoice';
import { cleanScannedCode, looksLikeInvoiceBarcode, looksLikeSaleBarcode } from '@/lib/barcode';
import { Badge } from '@/components/ui/DataDisplay';
import { itemDetails, customerItemName } from '@/lib/item-name';
import { availabilityCardNote, availabilityNote } from '@/lib/item-availability';
import { unitPricesForSubtotal } from '@/lib/subtotal-override';
import {
  bookingGross,
  bookingPayNow,
  customLinesForRequest,
  customLinesTotal,
  type CustomLineDraft,
  defaultTrousersCode,
  newBookingStatuses,
  repriceForLength,
  spreadDiscount,
  typedSubtotal as readTypedSubtotal,
} from '@/lib/booking-draft';
import { discountCodeHelp, discountOptionLabel, discountPickerHelp, offeredDiscounts } from '@/lib/discount';
import { useBookingDiscountPick } from '@/hooks/useBookingDiscountPick';
import { useItemAvailability } from '@/hooks/useItemAvailability';
import { AvailabilityNote } from '@/components/ui/AvailabilityNote';
import { useDefaultBankPot } from '@/hooks/useDefaultBankPot';
import {
  BookingInstitution,
  BookingPaymentMethod,
  CreateBookingRequest,
  BookingDraftForm,
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
  /** Transaction Fee the customer paid on top of `amount`. */
  fee: number;
  /** Where the total was charged: QRIS or the EDC. */
  via: string;
};

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

function catalogPrice(item: Item, mode: PosMode, length: RentalLength = '3d') {
  if (mode === 'sale') return item.selling_price || item.standard_price || 0;
  return rentalPrice(item, length);
}

function stockQty(item: Item) {
  return item.available_qty ?? item.quantity ?? 0;
}

function canSell(item: Item, mode: PosMode) {
  if (mode === 'sale') return !!item.is_sellable && stockQty(item) > 0;
  return item.status === 'available' && stockQty(item) > 0;
}

// Items that cannot go out on a rental, whatever the dates.
const OUT_OF_USE_STATUSES = new Set<string>(['maintenance', 'damaged', 'retired', 'lost']);

function toBookingPayment(coverage: PayCoverage, channel: PayChannel): BookingPaymentMethod {
  return `${coverage}_${channel}` as BookingPaymentMethod;
}

export function CashierPOS() {
  const { success, error, warning } = useToast();
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
  // The Event Date and the Rental Length fill the Pickup (rentalDate) and
  // Return dates. Staff may still change those two by hand.
  const [eventDate, setEventDate] = useState('');
  const [rentalLength, setRentalLength] = useState<RentalLength>('3d');
  const [rentalDate, setRentalDate] = useState(todayISO);
  const [returnDate, setReturnDate] = useState('');
  // Whether each cart Item is free on the chosen dates.
  const {
    check: checkAvailability,
    checkMany: checkManyAvailability,
    resultFor: availabilityFor,
    noteFor: availabilityNoteFor,
  } = useItemAvailability(rentalDate, returnDate);
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
  const [feeRuleId, setFeeRuleId] = useState('');
  const [pot, setPot] = useState('');
  const feeRules = useTransactionFeeRules();
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payCoverage, setPayCoverage] = useState<PayCoverage>('dp');
  const [discount, setDiscount] = useState('');
  // A typed Subtotal above the catalogue one, for items not in the catalogue
  // yet. '' is the sum of the lines.
  const [subtotalInput, setSubtotalInput] = useState('');
  // A typed down payment; '' is half of the total.
  const [dpInput, setDpInput] = useState('');
  const [notes, setNotes] = useState('');
  // Priced lines for things not in the catalogue yet, such as a tie. Only a
  // rental takes them: a Sale line must be a catalogue Item.
  const [customLines, setCustomLines] = useState<CustomLineDraft[]>([]);
  // Optional: '' is no guarantee left.
  const [guarantee, setGuarantee] = useState('');
  const [takeDeposit, setTakeDeposit] = useState(false);
  const { enabled: depositEnabled } = useDepositSettings();
  const [occasion, setOccasion] = useState<BookingInstitution>('wedding');
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [done, setDone] = useState<DoneReceipt | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [saleInvoice, setSaleInvoice] = useState<Sale | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [todayDepositReleases, setTodayDepositReleases] = useState<number | null>(null);

  const selectedPackage = packages.find((pkg) => pkg.id === packageId);
  const catalogueSubtotal = cart.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const packagePrice = selectedPackage?.price || 0;
  const addonTotal = cart
    .filter((line) => line.is_addon)
    .reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const discountAmount = Number(discount) || 0;
  // With a package, only add-on custom lines are charged; the package includes the rest.
  const customSubtotal = mode === 'rental' ? customLinesTotal(customLines, !!packageId) : 0;
  // The Subtotal counts every charged line: the Items (or the package and its
  // add-ons) and the custom items.
  const linesSubtotal = mode === 'rental'
    ? bookingGross({ packagePrice, addonSubtotal: addonTotal, itemsSubtotal: catalogueSubtotal, customSubtotal })
    : catalogueSubtotal;
  // A package sets its own price, so only a cart with no package takes a typed Subtotal.
  const canEditSubtotal = cart.length > 0 && !(mode === 'rental' && packageId);
  const { tooLow: subtotalTooLow, extra: subtotalExtra } = readTypedSubtotal(
    canEditSubtotal ? Number(subtotalInput) || 0 : 0,
    linesSubtotal,
  );
  // The extra of a typed Subtotal sits on the main Item line.
  const subtotal = catalogueSubtotal + subtotalExtra;
  const pricedUnits = unitPricesForSubtotal(cart, subtotal);
  const pricedCart = cart.map((line, index) => ({ ...line, unit_price: pricedUnits[index] }));
  const gross = linesSubtotal + subtotalExtra;
  const typedOff = Math.max(0, gross - (mode === 'rental' && packagePrice > 0 ? 0 : discountAmount));
  // The Discount picked for a rental, as on the New Booking form. The backend
  // applies it on save, before it takes the payment.
  const cartItemIds = useMemo(
    () => Array.from(new Set(cart.map((line) => line.item.id))).sort().join(','),
    [cart],
  );
  const discountPick = useBookingDiscountPick({
    open: mode === 'rental',
    customerId: customer?.id || '',
    total: gross,
    itemIds: cartItemIds,
  });
  const pickedDiscountAmount = mode === 'rental' ? discountPick.amountOff(gross, typedOff) : 0;
  const total = typedOff - pickedDiscountAmount;
  // A down payment takes half of the total and a full payment takes all of it.
  // The remaining amount is paid in full at pickup.
  const typedDownPayment = payCoverage === 'dp' ? Number(dpInput) || 0 : 0;
  const downPaymentTooHigh = mode === 'rental' && typedDownPayment > total;
  const paidAmount = bookingPayNow({ total, downPayment: payCoverage === 'dp', typedDownPayment });
  const remaining = Math.max(0, total - paidAmount);
  // What is charged now and with which method. A large QRIS payment adds a
  // fee the customer pays on top; the backend works it out on its own.
  const chargeNow = mode === 'rental' ? paidAmount : total;
  const chargeMethod = mode === 'rental' ? toBookingPayment(payCoverage, payChannel) : payChannel;
  useDefaultBankPot(chargeMethod, pot, setPot);
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
      // Every Item is listed; the availability check greys out the booked ones.
      const response = await apiClient.getItems(filters);
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
  }, [debouncedSearch, type, mode, error]);

  useEffect(() => {
    void loadItems(1, false);
  }, [loadItems]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const today = todayISO();
        const res = await apiClient.getRentals({
          page: 1,
          limit: 1,
          deposit_refunded_from: today,
          deposit_refunded_to: today,
        });
        if (!cancelled) {
          setTodayDepositReleases(res.data?.pagination?.total ?? 0);
        }
      } catch {
        if (!cancelled) setTodayDepositReleases(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    apiClient.getItemFacets(false, true).then((facets) => {
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
        hasMore: hasNextPage(res?.data?.pagination, rows.length, 20),
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

  // The listed Items too, once the event day sets the dates.
  useEffect(() => {
    if (mode !== 'rental' || !eventDate) return;
    checkManyAvailability(items.map((item) => item.id));
  }, [mode, eventDate, items, checkManyAvailability]);

  // New dates, or a new Item in the cart: check each rental line.
  useEffect(() => {
    if (mode !== 'rental') return;
    for (const line of cart) void checkAvailability(line.item.id);
  }, [mode, cart, checkAvailability]);

  // A Suit or a Jacket brings its default Trousers on a rental, as on the New
  // Booking form. Staff can remove them to rent the Suit only.
  const pairTrousers = useCallback(async (suit: Item, length: RentalLength) => {
    const code = defaultTrousersCode(suit);
    if (!code) return;
    try {
      const trousers = await apiClient.getItemByCode(code);
      if (!trousers?.id) return;
      setCart((prev) => {
        if (prev.some((line) => line.item.id === trousers.id)) return prev;
        const suitIndex = prev.findIndex((line) => line.item.id === suit.id);
        if (suitIndex < 0) return prev;
        const line: CartLine = {
          key: `${trousers.id}-${Date.now()}`,
          item: trousers,
          quantity: 1,
          unit_price: catalogPrice(trousers, 'rental', length),
          is_addon: false,
        };
        return [...prev.slice(0, suitIndex + 1), line, ...prev.slice(suitIndex + 1)];
      });
    } catch {
      warning('Trousers not added', `Add the trousers for ${suit.name} by hand.`);
    }
  }, [warning]);

  // Returns false when the Item did not go into the cart.
  const addItem = useCallback((item: Item): boolean => {
    if (!canSell(item, mode) && mode === 'sale') {
      error('Not sellable', `${customerItemName(item)} is not marked as sellable or is out of stock.`);
      return false;
    }
    // The event day sets the pickup and return dates that the availability
    // check and the price need, so a rental starts with it.
    if (mode === 'rental' && !eventDate) {
      error('Pick the event day first', 'The event day sets the pickup and return dates for the items.');
      setDatesOpen(true);
      window.setTimeout(() => document.querySelector<HTMLInputElement>('[data-testid="pos-event-date"]')?.focus(), 50);
      return false;
    }
    const isNewLine = !cart.some((line) => line.item.id === item.id);
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
          unit_price: catalogPrice(item, mode, rentalLength),
          is_addon: false,
        },
      ];
    });
    setFlashId(item.id);
    window.setTimeout(() => setFlashId(null), 450);
    if (mode === 'rental' && isNewLine) void pairTrousers(item, rentalLength);
    if (mode === 'rental') {
      // A clash warns but does not stop the sale: staff decide.
      void checkAvailability(item.id).then((result) => {
        if (result?.status === 'booked') {
          warning('Booked on these dates', `${customerItemName(item)}: ${availabilityNote(result).text}`);
        }
      });
    }
    return true;
  }, [mode, eventDate, rentalLength, cart, error, warning, checkAvailability, pairTrousers]);

  const pickEventDate = (value: string) => {
    setEventDate(value);
    if (!value) return;
    const { pickup, ret } = rentalWindow(value, rentalLength);
    setRentalDate(pickup);
    setReturnDate(ret);
  };

  // A new length moves the dates, and each line still at the old length's price.
  const pickRentalLength = (length: RentalLength) => {
    setRentalLength(length);
    if (eventDate) {
      const { pickup, ret } = rentalWindow(eventDate, length);
      setRentalDate(pickup);
      setReturnDate(ret);
    }
    if (mode === 'rental') {
      setCart((prev) => repriceForLength(prev, (line) => line.item, rentalLength, length));
    }
  };

  const setQty = (key: string, quantity: number) => {
    if (quantity < 1) {
      setCart((prev) => prev.filter((line) => line.key !== key));
      return;
    }
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, quantity } : line)));
  };

  // Every charged line takes a typed price, because not every catalogue price
  // is imported yet. The catalogue price is only the start. A line that the
  // package includes has no price of its own.
  const lineCharged = (line: CartLine) => !(mode === 'rental' && packageId && !line.is_addon);
  const lineCatalogPrice = (line: CartLine) => catalogPrice(line.item, mode, rentalLength);
  const setLinePrice = (key: string, price: number) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, unit_price: Math.max(0, price) } : line)));
  };

  const toggleAddon = (key: string) => {
    setCart((prev) => prev.map((line) => (line.key === key ? { ...line, is_addon: !line.is_addon } : line)));
  };

  // An emptied cart starts the next ticket at the catalogue subtotal.
  useEffect(() => {
    if (cart.length === 0) {
      setSubtotalInput('');
      setDpInput('');
    }
  }, [cart.length]);

  const resetTicket = () => {
    setCart([]);
    setCustomLines([]);
    setCustomer(null);
    setPackageId('');
    setDiscount('');
    discountPick.reset();
    setSubtotalInput('');
    setDpInput('');
    setNotes('');
    setPayCoverage('dp');
    setPayChannel('cash');
    setFeeRuleId('');
    setPot('');
    setGuarantee('');
    setTakeDeposit(false);
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
    // A sale receipt is not an item tag. Saying so beats "no item found", which
    // reads as a broken scanner.
    if (looksLikeSaleBarcode(cleaned)) {
      try {
        const sale = await apiClient.getSaleByBarcode(cleaned);
        error(`Sale ${sale.sale_number}`, 'That is a sale receipt. Open it on the Sales page to reprint.');
      } catch {
        error('Sale receipt', `No sale found for ${cleaned}.`);
      }
      return;
    }
    try {
      const item = await apiClient.searchByBarcode(cleaned);
      if (addItem(item)) success('Scanned', customerItemName(item));
    } catch {
      setSearch(cleaned);
      error('Not found', `No item for barcode ${cleaned}`);
    }
  };

  const handleCreatedCustomer = (created: Customer) => {
    if (created?.id) customersByIdRef.current.set(created.id, created);
    setCustomer(created);
    setNewCustomerOpen(false);
  };

  // The rental on the ticket as a booking request, without the money. A draft
  // keeps this, and Charge booking adds the payment to it.
  const rentalRequest = (): BookingDraftForm => {
    const lineDiscounts = spreadDiscount(
      pricedCart.map((line) => line.unit_price * line.quantity),
      packageId ? 0 : discountAmount,
    );
    return {
      customer_id: customer?.id,
      booking_date: rentalDate ? new Date(rentalDate).toISOString() : undefined,
      appointment_date: returnDate ? new Date(returnDate).toISOString() : undefined,
      event_date: eventDate ? new Date(eventDate).toISOString() : undefined,
      rental_length: rentalLength,
      booking_guarantee: guarantee,
      security_deposit_waived: depositEnabled ? !takeDeposit : undefined,
      institution: occasion,
      notes,
      package_pricing_id: packageId || undefined,
      ...(packageId ? {} : { total_amount: gross }),
      discount_amount: packageId ? 0 : discountAmount,
      discount_id: discountPick.discountId || undefined,
      custom_lines: customLinesForRequest(customLines),
      items: pricedCart.map((line, index) => ({
        item_id: line.item.id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        total_price: line.unit_price * line.quantity,
        discount_amount: lineDiscounts[index],
        is_addon: !!packageId && !!line.is_addon,
      })),
    };
  };

  // Save as draft keeps a rental for a customer who has not paid. It takes no
  // money and holds no items. Staff open it on Bookings to take the payment.
  const handleSaveDraft = async () => {
    if (mode !== 'rental' || cart.length === 0) return;
    if (!customer) {
      error('Customer required', 'Pick or add a customer before you save a draft.');
      setCartOpen(true);
      return;
    }
    try {
      setSavingDraft(true);
      await apiClient.saveBookingDraft(null, { amount: total, request: rentalRequest() });
      resetTicket();
      success('Draft saved', 'It holds no items. Open it on Bookings when the customer pays.');
    } catch (e) {
      error('Draft not saved', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleCharge = async () => {
    if (cart.length === 0) return;
    if (downPaymentTooHigh) {
      error('DP too high', 'The DP is above the total. Pick Full to take it all.');
      setCartOpen(true);
      return;
    }
    if (subtotalTooLow) {
      error('Subtotal too low', `It is below the lines, ${formatCurrency(linesSubtotal)}. Use Discount to take money off.`);
      setCartOpen(true);
      return;
    }
    if (potMissing(chargeMethod, pot) && (mode !== 'rental' || chargeNow > 0)) {
      error('Pick the bank', POT_MISSING_MESSAGE);
      return;
    }
    if (mode === 'rental' && !customer) {
      error('Customer required', 'Pick or add a customer before charging a rental.');
      setCartOpen(true);
      return;
    }
    if (mode === 'rental' && !eventDate) {
      error('Event day required', 'Pick the event day. It sets the pickup and return dates.');
      setDatesOpen(true);
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
          fee_rule_id: feeRuleId || undefined,
          pot: potForRequest(chargeMethod, pot),
          notes,
          items: pricedCart.map((line) => ({
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
          fee: sale.transaction_fee ?? transactionFee(total, payChannel, feeRules, feeRuleId),
          via: isQrisMethod(payChannel) ? 'QRIS' : 'EDC',
        });
        setSaleInvoice(sale);
        success('Sale recorded', sale.sale_number);
      } else {
        const statuses = newBookingStatuses(paidAmount, total);
        const paymentStatus = statuses.payment_status;
        let proofUrl: string | undefined;
        if (proofFile && paidAmount > 0) {
          try {
            proofUrl = await apiClient.uploadProofFile(proofFile, 'booking_payment');
          } catch {
            error('Proof upload failed', 'The booking is still charged. Attach the proof from Bookings.');
          }
        }
        const payload = {
          ...rentalRequest(),
          ...statuses,
          payment_method: toBookingPayment(payCoverage, payChannel),
          fee_rule_id: feeRuleId || undefined,
          pot: potForRequest(chargeMethod, pot),
          paid_amount: paidAmount,
          payment_proof_url: proofUrl,
          remaining_amount: remaining,
          created_by: user?.id,
        } as unknown as CreateBookingRequest;
        const booking = await apiClient.createBooking(payload);
        const bookingId = booking?.id;
        if (!bookingId) throw new Error('Booking was not created');
        setDone({
          title: 'Booking charged',
          subtitle: `Pickup is on Rentals · #${bookingId.slice(-8)}`,
          amount: paidAmount || total,
          fee: booking.transaction_fee ?? transactionFee(paidAmount, toBookingPayment(payCoverage, payChannel), feeRules, feeRuleId, pot),
          via: isQrisMethod(payChannel) ? 'QRIS' : 'EDC',
        });
        success('Booking created', 'Rental is waiting for pickup');
        discountPick.reset();
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
      setCustomLines([]);
      setCartOpen(false);
      setProofFile(null);
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

  // Only discounts this customer, this total and these items qualify for. The
  // list comes from the backend, so anything offered here is accepted on save.
  const offered = offeredDiscounts(discountPick.eligible, discountPick.code);
  const discountPicker = (
    <div className="grid grid-cols-1 gap-3">
      <Select
        searchable={false}
        label="Promo discount"
        value={discountPick.discountId}
        onChange={(e) => discountPick.setDiscountId(e.target.value)}
        disabled={offered.offered.length === 0}
        options={[
          { value: '', label: 'No discount' },
          ...offered.offered.map((d) => ({ value: d.id, label: discountOptionLabel(d, gross) })),
        ]}
        helperText={discountPickerHelp({
          loading: discountPick.loading,
          picked: offered.offered.find((d) => d.id === discountPick.discountId),
          offeredCount: offered.offered.length,
          total: gross,
          hasCustomer: !!customer,
        })}
        data-testid="pos-discount-pick"
      />
      <Input
        label="Discount code"
        value={discountPick.code}
        onChange={(e) => discountPick.setCode(e.target.value.toUpperCase())}
        placeholder="Only if the customer has one"
        helperText={discountCodeHelp(discountPick.code, offered.codeMatch, offered.codeOnlyCount)}
      />
    </div>
  );

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
                      <div className="truncate text-sm font-semibold text-slate-900">{customerItemName(line.item)}</div>
                      <div className="text-xs text-slate-500">
                        {itemDetails(line.item)}
                      </div>
                      {mode === 'rental' && (
                        <AvailabilityNote note={availabilityNoteFor(line.item.id)} testId="pos-availability" />
                      )}
                      {mode === 'rental' && !packageId && missingFourHourPrice(line.item, rentalLength) && (
                        <div className="text-[11px] font-medium text-amber-700" data-testid="pos-no-4h-price">No 4-hour price: 3-day price used</div>
                      )}
                      {lineCharged(line) && (
                        <div className="mt-1 w-36" data-testid="pos-line-price">
                          <CurrencyInput
                            label="Price"
                            value={line.unit_price}
                            onChange={(n) => setLinePrice(line.key, n || 0)}
                            error={line.unit_price <= 0
                              ? (lineCatalogPrice(line) <= 0 ? 'No price in the catalogue: type it' : 'Type the price')
                              : undefined}
                            helperText={line.unit_price > 0 && lineCatalogPrice(line) > 0 && line.unit_price !== lineCatalogPrice(line)
                              ? `Catalogue ${formatCurrency(lineCatalogPrice(line))}`
                              : undefined}
                          />
                        </div>
                      )}
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
            {/* Wrap, not a sideways scroll: a mouse wheel scrolls only up and down. */}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Package">
              <Chip selected={!packageId} onClick={() => setPackageId('')}>Item total</Chip>
              {packages.map((pkg) => (
                <Chip key={pkg.id} selected={packageId === pkg.id} onClick={() => setPackageId(pkg.id)}>
                  {pkg.package_name}
                </Chip>
              ))}
            </div>
            {packageId && (
              <p className="mt-1 text-xs text-slate-500">Items are included in the package by default. Click or tap the badge to charge one as an add-on.</p>
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
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">
                    {customer.first_name} {customer.last_name}
                  </span>
                  <Badge variant={customer.language === 'en' ? 'info' : 'default'}>
                    {customerLanguageLabel(customer.language)}
                  </Badge>
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Guarantee (optional)</div>
            <div className="flex flex-wrap gap-2">
              <Chip selected={guarantee === ''} onClick={() => setGuarantee('')}>
                None
              </Chip>
              {BOOKING_GUARANTEE_OPTIONS.map((option) => (
                <Chip key={option.value} selected={guarantee === option.value} onClick={() => setGuarantee(option.value)}>
                  {option.label}
                </Chip>
              ))}
            </div>
            {depositEnabled && (
              <label className="mt-2 flex min-h-11 items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={takeDeposit} onChange={(e) => setTakeDeposit(e.target.checked)} />
                Take security deposit at Pickup
              </label>
            )}
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
                onClick={() => setPayCoverage('full')}
                block
              >
                Full
              </Chip>
            </div>
          </div>
        )}

        <PaymentMethodPicker value={payChannel} onChange={setPayChannel} testIdPrefix="pos-pay" />

        {mode === 'rental' && paidAmount > 0 && (
          <ProofPick
            id="pos-payment-proof"
            file={proofFile}
            onChange={setProofFile}
            disabled={submitting}
            hint="Attach the transfer or QRIS receipt when the customer pays online."
          />
        )}

        {mode === 'rental' && payCoverage === 'dp' && (
          <CurrencyInput
            label="DP now"
            value={dpInput === '' ? paidAmount : dpInput}
            onChange={(n) => setDpInput(n ? String(n) : '')}
            error={downPaymentTooHigh ? 'The DP is above the total. Pick Full to take it all.' : undefined}
            helperText={`The customer pays ${formatCurrency(paidAmount)} now and ${formatCurrency(remaining)} in full at pickup. Empty takes half.`}
          />
        )}

        {cart.length > 0 && (
          <CurrencyInput
            label="Subtotal"
            value={subtotalInput === '' || !canEditSubtotal ? linesSubtotal : subtotalInput}
            onChange={(n) => setSubtotalInput(n && n !== linesSubtotal ? String(n) : '')}
            disabled={!canEditSubtotal}
            error={subtotalTooLow ? `Below the lines ${formatCurrency(linesSubtotal)}. Use Discount to take money off.` : undefined}
            helperText={
              !canEditSubtotal
                ? 'The package, its add-ons and the custom items.'
                : subtotalExtra > 0
                  ? `Lines ${formatCurrency(linesSubtotal)}. The extra ${formatCurrency(subtotalExtra)} goes on the price of the main item.`
                  : 'The Items and the custom items. Raise it to charge items that are not in the catalogue yet.'
            }
          />
        )}

        {!(mode === 'rental' && packageId) && (
          <CurrencyInput
            label="Discount"
            value={discount}
            onChange={(n) => setDiscount(n ? String(n) : '')}
          />
        )}

        {mode === 'rental' && discountPicker}

        {mode === 'rental' && (
          <div className="space-y-2" data-testid="pos-custom-lines">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Custom items</div>
              <button
                type="button"
                onClick={() => setCustomLines((prev) => [...prev, { name: '', quantity: 1, unit_price: 0, is_addon: !!packageId }])}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-indigo-700 touch-manipulation"
                data-testid="pos-add-custom-line"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {customLines.length === 0 ? (
              <p className="text-xs text-slate-500">For things not in the catalogue yet, such as a tie. They print on the receipt with their price.</p>
            ) : (
              customLines.map((line, index) => (
                <div key={index} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <Input
                      label="Item"
                      value={line.name}
                      onChange={(e) => setCustomLines((prev) => prev.map((entry, i) => (i === index ? { ...entry, name: e.target.value } : entry)))}
                      placeholder="e.g. Black satin tie"
                      maxLength={200}
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      label="Qty"
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => setCustomLines((prev) => prev.map((entry, i) => (i === index ? { ...entry, quantity: Math.max(1, Number(e.target.value) || 1) } : entry)))}
                    />
                  </div>
                  <div className="w-32">
                    <CurrencyInput
                      label="Price"
                      value={line.unit_price}
                      onChange={(n) => setCustomLines((prev) => prev.map((entry, i) => (i === index ? { ...entry, unit_price: n || 0 } : entry)))}
                      disabled={!!packageId && !line.is_addon}
                    />
                  </div>
                  {!!packageId && (
                    <button
                      type="button"
                      onClick={() => setCustomLines((prev) => prev.map((entry, i) => (i === index ? { ...entry, is_addon: !entry.is_addon } : entry)))}
                      className={clsx(
                        'mb-1 inline-flex min-h-9 items-center rounded-full px-2.5 text-[11px] font-semibold touch-manipulation',
                        line.is_addon ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {line.is_addon ? 'Add-on' : 'Included'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 touch-manipulation"
                    onClick={() => setCustomLines((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Remove custom item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
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
              <span>{customSubtotal > 0 ? 'Items' : 'Subtotal'}</span>
              <span className="tabular-nums">{formatCurrency(gross - customSubtotal)}</span>
            </div>
          )}
          {customSubtotal > 0 && (
            <div className="flex justify-between text-slate-500" data-testid="pos-custom-subtotal">
              <span>Custom items</span>
              <span className="tabular-nums">{formatCurrency(customSubtotal)}</span>
            </div>
          )}
          {(customSubtotal > 0 || (mode === 'rental' && packagePrice > 0 && addonTotal > 0)) && (
            <div className="flex justify-between font-semibold text-slate-700" data-testid="pos-lines-subtotal">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCurrency(gross)}</span>
            </div>
          )}
          {pickedDiscountAmount > 0 && (
            <div className="flex justify-between text-slate-500" data-testid="pos-promo-discount">
              <span>Promo discount</span>
              <span className="tabular-nums">−{formatCurrency(pickedDiscountAmount)}</span>
            </div>
          )}
          {mode === 'rental' && (
            <div className="flex justify-between text-slate-500">
              <span>Remaining at pickup</span>
              <span className="tabular-nums">{formatCurrency(remaining)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-slate-900">
            <span>{mode === 'rental' && payCoverage === 'dp' ? 'To charge' : 'Total'}</span>
            <span className="tabular-nums">{formatCurrency(mode === 'rental' && payCoverage === 'dp' ? paidAmount : total)}</span>
          </div>
          <TransactionFeeLines amount={chargeNow} method={chargeMethod} pot={pot} onPotChange={setPot} ruleId={feeRuleId} onRuleIdChange={setFeeRuleId} className="text-slate-500" />
        </div>
        <Button
          size="xl"
          className="w-full min-h-14 text-base"
          onClick={handleCharge}
          disabled={submitting || savingDraft || cart.length === 0}
          loading={submitting}
          data-testid="pos-charge"
        >
          {mode === 'rental' ? 'Charge booking' : 'Complete sale'}
        </Button>
        {mode === 'rental' && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleSaveDraft}
            disabled={submitting || cart.length === 0}
            loading={savingDraft}
            data-testid="pos-save-draft"
          >
            Save as draft · not paid
          </Button>
        )}
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
                {depositEnabled && (
                  <div
                    className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl glass-control px-3 text-sm text-slate-700"
                    title="Security deposits released today"
                    data-testid="pos-deposit-releases-today"
                  >
                    <HandCoins className="h-4 w-4 text-teal-600" />
                    <span className="tabular-nums font-semibold text-slate-900">
                      {todayDepositReleases === null ? '—' : todayDepositReleases}
                    </span>
                    <span className="hidden text-xs text-slate-500 xl:inline">releases today</span>
                  </div>
                )}
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

          {isPhone && depositEnabled && todayDepositReleases !== null && (
            <div
              className="flex items-center gap-1.5 text-xs text-slate-600"
              data-testid="pos-deposit-releases-today"
            >
              <HandCoins className="h-3.5 w-3.5 text-teal-600" />
              <span className="tabular-nums font-semibold text-slate-900">{todayDepositReleases}</span>
              <span>deposit releases today</span>
            </div>
          )}

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
                  {eventDate ? `Event ${shortDate(eventDate)} · ` : ''}
                  {RENTAL_LENGTHS.find((l) => l.value === rentalLength)?.label} · {shortDate(rentalDate)} → {shortDate(returnDate)}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            ) : (
              <div className="space-y-2">
              <div className="flex flex-wrap items-stretch gap-2">
                <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl glass-control px-3">
                  <Calendar className="h-4 w-4 shrink-0 text-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Event day *</div>
                    <input
                      type="date"
                      value={eventDate}
                      data-testid="pos-event-date"
                      onChange={(e) => pickEventDate(e.target.value)}
                      className="w-full bg-transparent text-base text-slate-900 outline-none"
                    />
                  </div>
                </label>
                <div className="flex shrink-0 items-center rounded-2xl glass-control p-1" role="group" aria-label="Rental length">
                  {RENTAL_LENGTHS.map((length) => (
                    <button
                      key={length.value}
                      type="button"
                      onClick={() => pickRentalLength(length.value)}
                      data-testid={`pos-length-${length.value}`}
                      aria-pressed={rentalLength === length.value}
                      className={clsx(
                        'min-h-9 rounded-xl px-3 text-sm font-semibold touch-manipulation',
                        rentalLength === length.value ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      )}
                    >
                      {length.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={clsx('flex gap-2', !isPhone && 'items-stretch')}>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <label className="flex min-h-11 items-center gap-2 rounded-2xl glass-control px-3">
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pickup</div>
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
              <p className="mt-1 text-xs text-slate-500">Try another search or type.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {items.map((item) => {
                  const selected = inCartIds.has(item.id);
                  const available = canSell(item, mode) || mode === 'rental';
                  // Rental: grey out an Item that is booked on the dates or out of use.
                  // It can still be added; the cart line warns.
                  const cardNote = mode === 'rental' && eventDate ? availabilityCardNote(availabilityFor(item.id)) : null;
                  const outOfUse = mode === 'rental' && OUT_OF_USE_STATUSES.has(item.status);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-testid="pos-item"
                      data-item-id={item.id}
                      onClick={() => addItem(item)}
                      title={cardNote?.detail}
                      className={clsx(
                        'group relative overflow-hidden rounded-2xl glass-panel text-left transition touch-manipulation active:scale-[0.98]',
                        selected && 'ring-2 ring-indigo-500',
                        flashId === item.id && 'ring-2 ring-emerald-500',
                        !available && mode === 'sale' && 'opacity-50',
                        (cardNote?.tone === 'clash' || outOfUse) && 'opacity-60 grayscale'
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
                          {customerItemName(item)}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-slate-500">
                            {itemDetails(item) || item.color || item.brand}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-900">
                            {formatCurrency(catalogPrice(item, mode, rentalLength))}
                          </span>
                        </div>
                        {outOfUse ? (
                          <div className="truncate text-[11px] font-semibold capitalize text-slate-600">{item.status}</div>
                        ) : cardNote && (
                          <div
                            data-testid="pos-item-availability"
                            className={clsx(
                              'truncate text-[11px] font-semibold',
                              cardNote.tone === 'clash' ? 'text-red-600' : 'text-amber-700',
                            )}
                          >
                            {cardNote.short}
                          </div>
                        )}
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
            {done.fee > 0 && (
              <p className="mt-1 text-sm text-slate-500" data-testid="pos-done-fee">
                + {TRANSACTION_FEE_LABEL} {formatCurrency(done.fee)} · Charged by {done.via} {formatCurrency(done.amount + done.fee)}
              </p>
            )}
            <Button size="xl" className="mt-8 w-full min-h-14" onClick={resetTicket}>
              New transaction
            </Button>
          </div>
        </div>
      )}

      <NewCustomerModal
        isOpen={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        onCreated={handleCreatedCustomer}
      />

      <BarcodeScanner isOpen={scannerOpen} onScan={handleBarcode} onClose={() => setScannerOpen(false)} />
      <BookingInvoiceModal
        isOpen={!!invoiceData}
        invoice={invoiceData}
        onClose={() => setInvoiceData(null)}
        autoSendWhatsApp
      />
      <SaleInvoiceModal
        isOpen={!!saleInvoice}
        sale={saleInvoice}
        onClose={() => setSaleInvoice(null)}
        autoSendWhatsApp
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
      aria-pressed={selected}
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
