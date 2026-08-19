'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, NumberInput, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { InvoiceSearchField } from '@/components/ui/InvoiceSearchField';
import ClientOnly from '@/components/ClientOnly';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import SimpleModal from '@/components/modals/SimpleModal';
import { formatCurrency } from '@/lib/currency';
import { discountAmountFor, discountOptionLabel } from '@/lib/discount';
import { formatDateShort } from '@/lib/date';
import { BOOKING_PAYMENT_METHOD_OPTIONS, formatPaymentMethod } from '@/lib/payment-methods';
import { BOOKING_OCCASION_OPTIONS } from '@/lib/select-options';
import { Booking, BookingFilters, BookingInstitution, Discount, InvoiceData, Customer, Item, PackagePricing } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { customerOptionLabel } from '@/lib/branch-scope';
import AutoCompleteSelect from '@/components/ui/AutoCompleteSelect';
import { Plus, Edit, Calendar, Eye, FileText, Download, ShoppingBag, CreditCard, Ban } from 'lucide-react';
import { BookingInvoiceModal } from '@/components/modals/BookingInvoiceModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { BookingDetailsModal } from '@/components/modals/BookingDetailsModal';
import { issueBookingInvoice } from '@/lib/issue-invoice';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, InfiniteScrollSentinel, SkeletonRow, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { hasNextPage, LIST_PAGE_SIZE, useInfiniteList } from '@/hooks/useInfiniteList';
import { useToast } from '@/contexts/ToastContext';

type BookingFormItem = {
  item_id: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  catalogue?: 'any' | 'trousers';
  is_addon?: boolean;
};

function bookingCustomerName(booking: Booking) {
  if (!booking.customer) return `Booking #${booking.id.slice(-8)}`;
  return `${booking.customer.first_name} ${booking.customer.last_name}`.trim();
}

function bookingItemSummary(booking: Booking) {
  const items = booking.items || [];
  if (items.length === 0) return '';
  const names = items.slice(0, 2).map((line) => {
    const name = line.item?.name || 'Item';
    const code = line.item?.code ? ` ${line.item.code}` : '';
    return line.quantity > 1 ? `${name}${code} ×${line.quantity}` : `${name}${code}`;
  });
  return names.join(', ') + (items.length > 2 ? ` +${items.length - 2}` : '');
}

function bookingPaymentCaption(booking: Booking) {
  const method = booking.payment_method ? formatPaymentMethod(booking.payment_method) : '';
  if (booking.payment_status === 'completed') return method ? `Paid · ${method}` : 'Paid';
  if (booking.payment_status === 'partial') {
    const remain = formatCurrency(booking.remaining_amount || 0);
    return method ? `Balance ${remain} · ${method}` : `Balance ${remain}`;
  }
  return method || 'Unpaid';
}

function bookingDateLine(booking: Booking) {
  const start = formatDateShort(booking.booking_date);
  if (!booking.appointment_date) return start;
  return `${start} – ${formatDateShort(booking.appointment_date)}`;
}

function bookingRentalCaption(booking: Booking) {
  const rental = booking.rental;
  if (!rental) return '';
  if (rental.status === 'active') {
    const days = Math.max(0, Math.ceil((new Date(rental.return_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return `${days}d left`;
  }
  if (rental.status === 'overdue') {
    const days = Math.max(0, Math.ceil((Date.now() - new Date(rental.return_date).getTime()) / (1000 * 60 * 60 * 24)));
    return `Overdue ${days}d`;
  }
  return `Rental ${rental.status}`;
}

export default function BookingsPage() {
  const { user } = useAuth();
  const { warning, success, error: toastError } = useToast();
  const [filters, setFilters] = useState<BookingFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [packageOptions, setPackageOptions] = useState<Array<{ value: string; label: string; price: number }>>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  /** The discount the operator picked, applied to the booking on save. */
  const [discountId, setDiscountId] = useState('');
  /** A code the customer quoted. It unlocks the discount that needs it. */
  const [discountCode, setDiscountCode] = useState('');
  const [eligibleDiscounts, setEligibleDiscounts] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [downPayment, setDownPayment] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  // Previous static options states no longer used; keeping for future caching if needed
  const [bookingForm, setBookingForm] = useState<{
    customer_id: string;
    booking_date: string;
    appointment_date?: string;
    booking_guarantee: string;
    booking_guarantee_other?: string;
    institution: BookingInstitution | '';
    notes?: string;
    status: Booking['status'];
    payment_status: Booking['payment_status'];
    payment_method: NonNullable<Booking['payment_method']>;
    items: Array<BookingFormItem>;
  }>({
    customer_id: '',
    booking_date: new Date().toISOString().slice(0, 10),
    booking_guarantee: 'KTP',
    institution: 'wedding',
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'dp_transfer',
    items: [
      { item_id: '', quantity: 1, unit_price: 0, discount_amount: 0, catalogue: 'any', is_addon: false }
    ],
  });

  const selectedPackage = packageOptions.find(p => p.value === selectedPackageId);
  const packagePrice = selectedPackage?.price || 0;
  const itemsSubtotal = bookingForm.items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  const itemsDiscount = bookingForm.items.reduce((sum, it) => sum + (it.discount_amount || 0), 0);
  const addonSubtotal = bookingForm.items
    .filter((it) => it.is_addon)
    .reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  const addonDiscount = bookingForm.items
    .filter((it) => it.is_addon)
    .reduce((sum, it) => sum + (it.discount_amount || 0), 0);
  const bookingTotal = packagePrice > 0 ? packagePrice + addonSubtotal : itemsSubtotal;
  const bookingDiscount = packagePrice > 0 ? addonDiscount : itemsDiscount;
  const bookingFinal = bookingTotal - bookingDiscount;
  const remainingAmount = bookingFinal - downPayment;

  const updateBookingField = (field: keyof typeof bookingForm, value: string) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateItemField = (index: number, field: keyof BookingFormItem, value: string | number | boolean) => {
    setBookingForm(prev => {
      const items = prev.items.map((it, i) => {
        if (i !== index) return it;
        if (field === 'item_id' || field === 'catalogue') return { ...it, [field]: String(value) };
        if (field === 'is_addon') return { ...it, is_addon: Boolean(value) };
        return { ...it, [field]: typeof value === 'string' ? Number(value) : value };
      });
      return { ...prev, items };
    });
  };

  const itemCacheRef = useRef<Map<string, Item>>(new Map());
  const itemIdsKey = useMemo(() => Array.from(new Set(bookingForm.items.map(it => it.item_id).filter(Boolean))).sort().join(','), [bookingForm.items]);
  useEffect(() => {
    const fillItemsAndPairTrousers = async () => {
      try {
        const uniqueIds = itemIdsKey ? itemIdsKey.split(',').filter(Boolean) : [];
        if (uniqueIds.length === 0) return;
        const idsToFetch = uniqueIds.filter(id => !itemCacheRef.current.has(id));
        if (idsToFetch.length > 0) {
          await Promise.all(idsToFetch.map(async (id) => {
            try {
              const item = await apiClient.getItem(id);
              if (item) itemCacheRef.current.set(id, item);
            } catch {}
          }));
        }
        const pairedTrousers: Item[] = [];
        for (const id of uniqueIds) {
          const item = itemCacheRef.current.get(id);
          if (!item?.trousers_code || (item.type !== 'suit' && item.type !== 'jacket')) continue;
          try {
            const trousers = await apiClient.getItemByCode(item.trousers_code);
            if (trousers?.id) {
              itemCacheRef.current.set(trousers.id, trousers);
              pairedTrousers.push(trousers);
            }
          } catch {}
        }
        setBookingForm(prev => {
          let items = prev.items.map(it => it.item_id && (!it.unit_price || it.unit_price === 0)
            ? { ...it, unit_price: itemCacheRef.current.get(it.item_id)?.standard_price ?? itemCacheRef.current.get(it.item_id)?.one_day_price ?? 0 }
            : it);
          for (const trousers of pairedTrousers) {
            if (items.some(it => it.item_id === trousers.id)) continue;
            const suitIndex = items.findIndex(it => itemCacheRef.current.get(it.item_id)?.trousers_code === trousers.code);
            const line = {
              item_id: trousers.id,
              quantity: 1,
              unit_price: trousers.standard_price ?? trousers.one_day_price ?? 0,
              discount_amount: 0,
              catalogue: 'trousers' as const,
              is_addon: false,
            };
            if (suitIndex >= 0) {
              items = [...items.slice(0, suitIndex + 1), line, ...items.slice(suitIndex + 1)];
            } else {
              items = [...items, line];
            }
          }
          return { ...prev, items };
        });
      } catch {}
    };
    fillItemsAndPairTrousers();
  }, [itemIdsKey]);

  /**
   * Keep the discount picker in step with the form.
   *
   * Eligibility depends on the Customer, the total and the Items, and all three
   * change while the operator works. The backend decides — the form never guesses — so this
   * re-asks on every change, 400 ms after the typing stops. A stale reply is
   * dropped so a slow request cannot overwrite a newer list.
   */
  const discountPickerOpen = isCreateModalOpen || isEditModalOpen;
  useEffect(() => {
    if (!discountPickerOpen) return;
    let live = true;
    setLoadingDiscounts(true);
    const timer = setTimeout(async () => {
      try {
        const list = await apiClient.getEligibleBookingDiscounts(
          bookingForm.customer_id,
          bookingTotal,
          itemIdsKey ? itemIdsKey.split(',') : [],
        );
        if (!live) return;
        setEligibleDiscounts(list);
        // A discount that no longer fits must not stay picked, or the save
        // silently drops it after the booking is already written.
        setDiscountId((current) => (current && !list.some((d) => d.id === current) ? '' : current));
      } catch (err) {
        if (!live) return;
        console.error('Failed to load eligible discounts', err);
        setEligibleDiscounts([]);
      } finally {
        if (live) setLoadingDiscounts(false);
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [discountPickerOpen, bookingForm.customer_id, bookingTotal, itemIdsKey]);

  /**
   * A quoted code picks its own discount, and clearing the code drops it again.
   *
   * The operator types what the customer shows and the discount lands in the
   * picker already selected. Nothing else is touched, so a code cannot override
   * a discount the operator chose by hand.
   */
  useEffect(() => {
    const typed = discountCode.trim().toUpperCase();
    if (!typed) {
      setDiscountId((current) => {
        const held = eligibleDiscounts.find((discount) => discount.id === current);
        return held?.requires_code ? '' : current;
      });
      return;
    }
    const match = eligibleDiscounts.find((discount) => (discount.code || '').toUpperCase() === typed);
    if (match) setDiscountId(match.id);
  }, [discountCode, eligibleDiscounts]);

  const addItemLine = (catalogue: 'any' | 'trousers' = 'any', isAddon = false) => {
    setBookingForm(prev => ({ ...prev, items: [...prev.items, { item_id: '', quantity: 1, unit_price: 0, discount_amount: 0, catalogue, is_addon: isAddon }] }));
  };

  const removeItemLine = (index: number) => {
    setBookingForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const submitCreateBooking = async () => {
    // basic validation
    const errs: Record<string, string> = {};
    if (!bookingForm.customer_id) errs.customer_id = 'Customer ID is required';
    if (!bookingForm.booking_date) errs.booking_date = 'Booking date is required';
    const bookingGuarantee = bookingForm.booking_guarantee === 'Other'
      ? bookingForm.booking_guarantee_other?.trim()
      : bookingForm.booking_guarantee;
    if (!bookingGuarantee) errs.booking_guarantee = 'Booking guarantee is required';
    if (!bookingForm.institution) errs.institution = 'Occasion is required';
    if (bookingForm.items.length === 0) errs.items = 'At least one item is required';
    
    // Validate that all items have valid item_id
    const validItems = bookingForm.items.filter(it => it.item_id && it.item_id.trim() !== '');
    if (validItems.length === 0) errs.items = 'At least one valid item is required';
    
    bookingForm.items.forEach((it, idx) => {
      if (!it.item_id) errs[`item_${idx}`] = 'Item ID required';
      if (!it.quantity || it.quantity < 1) errs[`item_qty_${idx}`] = 'Quantity >= 1';
    });
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setCreating(true);
      if (!user?.id) {
        toastError('Please sign in again', 'Your session expired.');
        return;
      }

      const payload = {
        customer_id: bookingForm.customer_id,
        booking_date: new Date(bookingForm.booking_date).toISOString(),
        appointment_date: bookingForm.appointment_date ? new Date(bookingForm.appointment_date).toISOString() : undefined,
        booking_guarantee: bookingGuarantee,
        institution: bookingForm.institution,
        notes: bookingForm.notes,
        status: bookingForm.status,
        payment_status: bookingForm.payment_status,
        payment_method: bookingForm.payment_method,
        package_pricing_id: selectedPackageId || undefined,
        // Don't send total_amount when package pricing is used - let backend calculate it
        ...(selectedPackageId ? {} : { total_amount: bookingTotal }),
        paid_amount: downPayment,
        discount_amount: bookingDiscount,
        remaining_amount: remainingAmount,
        created_by: user.id, // Add the current user ID
        items: validItems.map(it => ({
          item_id: it.item_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.unit_price * it.quantity,
          discount_amount: it.discount_amount || 0,
          is_addon: !!selectedPackageId && !!it.is_addon,
        })),
      } as unknown as import('@/types').CreateBookingRequest;

      const created = await apiClient.createBooking(payload as unknown as import('@/types').CreateBookingRequest);
      if (created?.id && discountId) {
        try {
          await apiClient.applyDiscountToBooking(discountId, created.id);
        } catch (err) {
          warning('Discount not applied', apiErrorMessage(err, 'This discount is not available for this customer.'));
        }
      }
      setIsCreateModalOpen(false);
      setBookingForm({
        customer_id: '',
        booking_date: new Date().toISOString().slice(0, 10),
        booking_guarantee: 'KTP',
        institution: 'wedding',
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'dp_transfer',
        items: [{ item_id: '', quantity: 1, unit_price: 0, discount_amount: 0, catalogue: 'any', is_addon: false }],
      });
      setDiscountId('');
      setDiscountCode('');
      setDownPayment(0);
      await reload();
      if (created?.id && (created.paid_amount || downPayment) > 0) {
        await openIssuedInvoice({
          id: created.id,
          payment_status: created.payment_status,
          paid_amount: created.paid_amount ?? downPayment,
        });
      }
    } catch (e) {
      console.error('Create booking failed', e);
      setFormErrors({ submit: apiErrorMessage(e, 'Failed to create booking. Please try again.') });
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (booking: Booking) => {
    const standardGuarantees = ['KTP', 'Passport', 'Student ID'];
    const isStandardGuarantee = standardGuarantees.includes(booking.booking_guarantee);
    setActiveBooking(booking);
    setBookingForm({
      customer_id: booking.customer_id,
      booking_date: booking.booking_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      appointment_date: booking.appointment_date?.slice(0, 10),
      booking_guarantee: isStandardGuarantee ? booking.booking_guarantee : 'Other',
      booking_guarantee_other: isStandardGuarantee ? '' : booking.booking_guarantee,
      institution: booking.institution || '',
      notes: booking.notes || '',
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: (booking.payment_method || 'dp_transfer') as NonNullable<Booking['payment_method']>,
      items: (booking.items || []).map(it => ({
        item_id: it.item_id,
        quantity: it.quantity,
        unit_price: it.unit_price || it.final_price || 0,
        discount_amount: it.discount_amount || 0,
        catalogue: it.item?.type === 'trousers' ? 'trousers' as const : 'any' as const,
        is_addon: !!it.is_addon,
      }))
    });
    setSelectedPackageId(booking.package_pricing_id || '');
    setDownPayment(booking.paid_amount || 0);
    setDiscountId('');
    setDiscountCode('');
    setIsEditModalOpen(true);
  };

  const submitEditBooking = async () => {
    if (!activeBooking) return;
    const errs: Record<string, string> = {};
    if (!bookingForm.customer_id) errs.customer_id = 'Customer ID is required';
    if (!bookingForm.booking_date) errs.booking_date = 'Booking date is required';
    const bookingGuarantee = bookingForm.booking_guarantee === 'Other'
      ? bookingForm.booking_guarantee_other?.trim()
      : bookingForm.booking_guarantee;
    if (!bookingGuarantee) errs.booking_guarantee = 'Booking guarantee is required';
    if (!bookingForm.institution) errs.institution = 'Occasion is required';
    if (bookingForm.items.length === 0) errs.items = 'At least one item is required';
    
    // Validate that all items have valid item_id
    const validItems = bookingForm.items.filter(it => it.item_id && it.item_id.trim() !== '');
    if (validItems.length === 0) errs.items = 'At least one valid item is required';
    
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      setCreating(true);
      const isLocked = activeBooking.payment_status === 'completed';
      const payload = (isLocked
        ? {
            // Lock financial edits after payment completed; allow only non-financial fields
            notes: bookingForm.notes,
            appointment_date: bookingForm.appointment_date ? new Date(bookingForm.appointment_date).toISOString() : undefined,
            booking_guarantee: bookingGuarantee,
            institution: bookingForm.institution || undefined,
          }
        : {
            customer_id: bookingForm.customer_id,
            booking_date: new Date(bookingForm.booking_date).toISOString(),
            appointment_date: bookingForm.appointment_date ? new Date(bookingForm.appointment_date).toISOString() : undefined,
            booking_guarantee: bookingGuarantee,
            institution: bookingForm.institution || undefined,
            notes: bookingForm.notes,
            status: bookingForm.status,
            payment_status: bookingForm.payment_status,
            payment_method: bookingForm.payment_method,
            // To remove package, send empty string (backend treats it as clear)
            package_pricing_id: selectedPackageId ? selectedPackageId : '',
            // Don't send total_amount when package pricing is used - let backend calculate it
            ...(selectedPackageId ? {} : { total_amount: bookingTotal }),
            paid_amount: downPayment,
            discount_amount: bookingDiscount,
            remaining_amount: remainingAmount,
            items: validItems.map(it => ({
              item_id: it.item_id,
              quantity: it.quantity,
              unit_price: it.unit_price,
              total_price: it.unit_price * it.quantity,
              discount_amount: it.discount_amount || 0,
              is_addon: !!selectedPackageId && !!it.is_addon,
            })),
          }
      ) as unknown as import('@/types').CreateBookingRequest;

      await apiClient.updateBooking(activeBooking.id, payload as unknown as Partial<import('@/types').CreateBookingRequest>);
      const previousPaid = activeBooking.paid_amount || 0;
      const issuedId = activeBooking.id;
      const paidNow = downPayment;
      const issuedStatus = remainingAmount <= 0 ? 'completed' : paidNow > 0 ? 'partial' : 'pending';
      if (activeBooking.id && discountId) {
        try {
          await apiClient.applyDiscountToBooking(discountId, activeBooking.id);
        } catch (err) {
          warning('Discount not applied', apiErrorMessage(err, 'This discount is not available for this customer.'));
        }
      }
      setIsEditModalOpen(false);
      setActiveBooking(null);
      setDiscountId('');
      setDiscountCode('');
      setDownPayment(0);
      await reload();
      if (paidNow > previousPaid) {
        await openIssuedInvoice({
          id: issuedId,
          payment_status: issuedStatus,
          paid_amount: paidNow,
        });
      }
    } catch (e) {
      console.error('Update booking failed', e);
      setFormErrors({ submit: apiErrorMessage(e, 'Failed to update booking. Please try again.') });
    } finally {
      setCreating(false);
    }
  };

  // Options are fetched via SearchSelect on demand

  const fetchCustomerOptions = async (query: string) => {
    if (query && query.trim().length >= 2) {
      const results = await apiClient.searchCustomers(query.trim());
      return results.map((c) => ({ value: c.id, label: customerOptionLabel(c) }));
    }
    const customersRes = await apiClient.getCustomers({ page: 1, limit: 50 });
    const customers = customersRes?.data?.data?.customers as Customer[] || [];
    return customers.map((c) => ({ value: c.id, label: customerOptionLabel(c) }));
  };

  const itemOptionLabel = (it: Item) => {
    const type = it.type ? it.type.charAt(0).toUpperCase() + it.type.slice(1) : 'Item';
    const size = it.size?.label ? ` · ${it.size.label}` : '';
    return `${it.name} · ${type}${size} (${it.code})`;
  };

  const fetchItemOptions = async (query: string) => {
    if (query && query.trim().length >= 2) {
      const results = await apiClient.searchItems(query.trim());
      return results.map((it) => ({ value: it.id, label: itemOptionLabel(it) }));
    }
    const itemsRes = await apiClient.getItems();
    const items = itemsRes?.data?.data?.items as Item[] || [];
    return items.map((it) => ({ value: it.id, label: itemOptionLabel(it) }));
  };

  const fetchTrousersOptions = async (query: string) => {
    if (query && query.trim().length >= 2) {
      const results = await apiClient.searchItems(query.trim());
      return results
        .filter((it) => it.type === 'trousers')
        .map((it) => ({ value: it.id, label: itemOptionLabel(it) }));
    }
    const itemsRes = await apiClient.getItems({ type: 'trousers', page: 1, limit: 50 });
    const items = itemsRes?.data?.data?.items as Item[] || [];
    return items.map((it) => ({ value: it.id, label: itemOptionLabel(it) }));
  };

  // Load package pricing when modal opens
  useEffect(() => {
    const loadPackages = async () => {
      try {
        const pkgs = await apiClient.getPackagePricing();
        setPackageOptions([
          { value: '', label: 'No Package', price: 0 },
          ...pkgs.map((p: PackagePricing) => ({ value: p.id, label: `${p.package_name} • ${formatCurrency(p.price)}` as string, price: p.price }))
        ]);
      } catch (e) {
        console.error('Failed to load packages', e);
      }
    };
    if (isCreateModalOpen || isEditModalOpen) loadPackages();
  }, [isCreateModalOpen, isEditModalOpen]);

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPackageId(pkgId);
  };

  const loadBookingsPage = useCallback(async (page: number) => {
    try {
      const response = await apiClient.getBookings({ ...filters, page, limit: LIST_PAGE_SIZE });
      const list = response?.data?.data?.bookings || [];
      const pagination = response?.data?.pagination;
      return {
        items: Array.isArray(list) ? list : [],
        hasMore: hasNextPage(pagination, list.length),
        total: pagination?.total || 0,
      };
    } catch {
      warning('Unable to load bookings', 'Backend may be offline. Please try again.');
      return { items: [], hasMore: false, total: 0 };
    }
  }, [filters, warning]);

  const {
    items: bookings,
    loading,
    loadingMore,
    hasMore,
    total,
    reload,
    sentinelRef,
  } = useInfiniteList(loadBookingsPage);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) setSearchInput(q);
  }, []);

  const handleSearch = (search: string) => {
    setSearchInput(search);
  };

  // Debounce search to reduce API calls
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput || undefined }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const bookingStatusVariant = (s: string): 'success' | 'warning' | 'primary' | 'default' | 'danger' => {
    switch (s) {
      case 'confirmed': return 'success';
      case 'pending':   return 'warning';
      case 'active':    return 'primary';
      case 'completed': return 'default';
      case 'cancelled': return 'danger';
      default:          return 'default';
    }
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payments' },
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'completed', label: 'Completed' },
  ];
  const handleGenerateInvoice = async (bookingId: string, invoiceType: 'dp' | 'full') => {
    try {
      const invoice = await apiClient.generateInvoice(bookingId, invoiceType);
      if (!invoice) {
        throw new Error('No invoice data received from server');
      }
      if (!invoice.items || !Array.isArray(invoice.items)) {
        invoice.items = [];
      }
      setInvoiceData(invoice);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      toastError('Could not generate invoice', 'Please try again.');
    }
  };

  const openIssuedInvoice = async (booking: { id: string; payment_status: string; paid_amount?: number }) => {
    try {
      const invoice = await issueBookingInvoice(booking);
      if (!invoice) return;
      setInvoiceData(invoice);
      setShowInvoiceModal(true);
    } catch {
      toastError('Payment recorded, invoice failed', 'Print it from the booking menu if the customer needs a copy.');
    }
  };

  const payingRemaining = payingBooking
    ? payingBooking.remaining_amount || Math.max(0, ((payingBooking.total_amount || 0) - (payingBooking.discount_amount || 0)) - (payingBooking.paid_amount || 0))
    : 0;

  const submitFullPayment = async () => {
    if (!payingBooking) return;
    if (payingRemaining <= 0) {
      warning('Already paid', 'This booking is already fully paid.');
      setPayingBooking(null);
      return;
    }
    try {
      setPaying(true);
      await apiClient.addPayment(
        payingBooking.id,
        payingRemaining,
        payingBooking.payment_method || 'cash',
        new Date().toISOString().slice(0, 10)
      );
      const paidBooking = {
        id: payingBooking.id,
        payment_status: 'completed' as const,
        paid_amount: (payingBooking.paid_amount || 0) + payingRemaining,
      };
      await reload();
      success('Payment recorded', formatCurrency(payingRemaining));
      setPayingBooking(null);
      setIsViewModalOpen(false);
      await openIssuedInvoice(paidBooking);
    } catch {
      toastError('Payment failed', 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const submitCancelBooking = async () => {
    if (!cancellingBooking) return;
    try {
      setCancelling(true);
      await apiClient.cancelBooking(cancellingBooking.id);
      await reload();
      success('Booking cancelled', 'The linked pending rental was cancelled with it.');
      setCancellingBooking(null);
    } catch (err) {
      toastError('Could not cancel booking', apiErrorMessage(err, 'Please try again.'));
    } finally {
      setCancelling(false);
    }
  };

  // Rental creation is handled exclusively from the Rentals menu for UI simplicity

  return (
    <>
      <PageShell
        title="Bookings"
        subtitle="Manage customer bookings and reservations"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/cashier">
              <Button size="md" variant="secondary">Cashier POS</Button>
            </Link>
            <Button size="md" onClick={() => { setDiscountId(''); setDiscountCode(''); setIsCreateModalOpen(true); }}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        }
      >
        <ClientOnly>
          <FilterBar>
            <InvoiceSearchField
              value={searchInput}
              onChange={handleSearch}
              placeholder="Search name, phone, or scan invoice…"
              onFound={(booking) => {
                setActiveBooking(booking);
                setIsViewModalOpen(true);
              }}
            />
            <Select
              searchable={false}
              options={statusOptions}
              value={filters.status || ''}
              onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value || undefined })); }}
            />
            <Select
              searchable={false}
              options={paymentStatusOptions}
              value={filters.payment_status || ''}
              onChange={(e) => { setFilters(prev => ({ ...prev, payment_status: e.target.value || undefined })); }}
            />
          </FilterBar>
        </ClientOnly>

        {/* Bookings List */}
        <div className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-10 w-10" />}
              title="No bookings found"
              description={Object.values(filters).some(v => v) ? 'Try adjusting your filters' : 'Get started by creating your first booking'}
              action={<Button onClick={() => { setDiscountId(''); setDiscountCode(''); setIsCreateModalOpen(true); }}><Plus className="h-4 w-4" /> New Booking</Button>}
            />
          ) : (
            (Array.isArray(bookings) ? bookings : []).map((booking) => {
              const meta = [
                bookingDateLine(booking),
                bookingItemSummary(booking),
                booking.branch?.name,
                bookingRentalCaption(booking),
              ].filter(Boolean).join(' · ');
              const notes = booking.notes?.trim();

              return (
                <Card key={booking.id} padding="sm" className="relative z-0 [&:has(details[open])]:z-30" data-testid="booking-row">
                  <CardContent className="flex items-start gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => { setActiveBooking(booking); setIsViewModalOpen(true); }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{bookingCustomerName(booking)}</span>
                        <Badge variant={bookingStatusVariant(booking.status)} dot className="capitalize">{booking.status}</Badge>
                      </div>
                      {meta && <p className="mt-0.5 truncate text-sm text-slate-500">{meta}</p>}
                      {notes && <p className="mt-0.5 truncate text-xs text-slate-400">{notes}</p>}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatCurrency((booking.total_amount || 0) - (booking.discount_amount || 0))}
                        </p>
                        <p className="text-[11px] text-slate-400">{bookingPaymentCaption(booking)}</p>
                      </div>
                      <OverflowMenu>
                        <OverflowMenuItem icon={<Eye className="h-4 w-4 text-slate-400" />} onClick={() => { setActiveBooking(booking); setIsViewModalOpen(true); }}>
                          View
                        </OverflowMenuItem>
                        {booking.payment_status !== 'completed' && (
                          <OverflowMenuItem icon={<Edit className="h-4 w-4 text-slate-400" />} onClick={() => openEdit(booking)}>
                            Edit
                          </OverflowMenuItem>
                        )}
                        {booking.payment_status === 'pending' && (
                          <OverflowMenuItem icon={<FileText className="h-4 w-4 text-slate-400" />} onClick={() => handleGenerateInvoice(booking.id, 'dp')}>
                            DP invoice
                          </OverflowMenuItem>
                        )}
                        {(booking.payment_status === 'partial' || booking.payment_status === 'completed') && (
                          <OverflowMenuItem icon={<Download className="h-4 w-4 text-slate-400" />} onClick={() => handleGenerateInvoice(booking.id, 'full')}>
                            Full invoice
                          </OverflowMenuItem>
                        )}
                        {booking.payment_status === 'partial' && booking.paid_amount > 0 && (
                          <OverflowMenuItem icon={<FileText className="h-4 w-4 text-slate-400" />} onClick={() => handleGenerateInvoice(booking.id, 'dp')}>
                            DP invoice
                          </OverflowMenuItem>
                        )}
                        {booking.payment_status === 'partial' && booking.remaining_amount > 0 && (
                          <OverflowMenuItem icon={<CreditCard className="h-4 w-4 text-slate-400" />} onClick={() => setPayingBooking(booking)}>
                            Collect balance
                          </OverflowMenuItem>
                        )}
                        {booking.status !== 'cancelled' && (
                          <OverflowMenuItem
                            icon={<ShoppingBag className="h-4 w-4 text-slate-400" />}
                            href={`/dashboard/sales?booking_id=${booking.id}&customer_id=${booking.customer_id}`}
                          >
                            Add-on sale
                          </OverflowMenuItem>
                        )}
                        {booking.status !== 'cancelled' && (
                          <OverflowMenuItem
                            danger
                            icon={<Ban className="h-4 w-4" />}
                            onClick={() => setCancellingBooking(booking)}
                          >
                            Cancel booking
                          </OverflowMenuItem>
                        )}
                      </OverflowMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Create Booking Modal */}
        <SimpleModal
          isOpen={isCreateModalOpen}
          title="New Booking"
          onClose={() => setIsCreateModalOpen(false)}
        >
          <BookingFormFields
            bookingForm={bookingForm}
            formErrors={formErrors}
            selectedPackageId={selectedPackageId}
            packageOptions={packageOptions}
            discountId={discountId}
            discountCode={discountCode}
            eligibleDiscounts={eligibleDiscounts}
            loadingDiscounts={loadingDiscounts}
            bookingTotal={bookingTotal}
            downPayment={downPayment}
            locked={false}
            fetchCustomerOptions={fetchCustomerOptions}
            fetchItemOptions={fetchItemOptions}
            fetchTrousersOptions={fetchTrousersOptions}
            updateBookingField={updateBookingField}
            updateItemField={updateItemField}
            addItemLine={addItemLine}
            removeItemLine={removeItemLine}
            handleSelectPackage={handleSelectPackage}
            setDiscountId={setDiscountId}
            setDiscountCode={setDiscountCode}
            setDownPayment={setDownPayment}
          />
          <BookingFormTotals
            selectedPackageId={selectedPackageId}
            packagePrice={packagePrice}
            addonSubtotal={addonSubtotal}
            bookingDiscount={bookingDiscount}
            bookingTotal={bookingTotal}
            bookingFinal={bookingFinal}
            downPayment={downPayment}
            remainingAmount={remainingAmount}
            submitError={formErrors.submit}
            loading={creating}
            submitLabel="Create"
            onCancel={() => setIsCreateModalOpen(false)}
            onSubmit={submitCreateBooking}
          />
        </SimpleModal>

        {/* Edit Booking Modal */}
        <SimpleModal
          isOpen={isEditModalOpen}
          title="Edit Booking"
          onClose={() => { setIsEditModalOpen(false); setActiveBooking(null); }}
        >
          <BookingFormFields
            bookingForm={bookingForm}
            formErrors={formErrors}
            selectedPackageId={selectedPackageId}
            packageOptions={packageOptions}
            discountId={discountId}
            discountCode={discountCode}
            eligibleDiscounts={eligibleDiscounts}
            loadingDiscounts={loadingDiscounts}
            bookingTotal={bookingTotal}
            downPayment={downPayment}
            locked={activeBooking?.payment_status === 'completed'}
            fetchCustomerOptions={fetchCustomerOptions}
            fetchItemOptions={fetchItemOptions}
            fetchTrousersOptions={fetchTrousersOptions}
            updateBookingField={updateBookingField}
            updateItemField={updateItemField}
            addItemLine={addItemLine}
            removeItemLine={removeItemLine}
            handleSelectPackage={handleSelectPackage}
            setDiscountId={setDiscountId}
            setDiscountCode={setDiscountCode}
            setDownPayment={setDownPayment}
          />
          <BookingFormTotals
            selectedPackageId={selectedPackageId}
            packagePrice={packagePrice}
            addonSubtotal={addonSubtotal}
            bookingDiscount={bookingDiscount}
            bookingTotal={bookingTotal}
            bookingFinal={bookingFinal}
            downPayment={downPayment}
            remainingAmount={remainingAmount}
            submitError={formErrors.submit}
            loading={creating}
            submitLabel="Save"
            onCancel={() => { setIsEditModalOpen(false); setActiveBooking(null); }}
            onSubmit={submitEditBooking}
          />
        </SimpleModal>

        <BookingDetailsModal
          isOpen={isViewModalOpen}
          booking={activeBooking}
          onClose={() => { setIsViewModalOpen(false); setActiveBooking(null); }}
          onEdit={
            activeBooking && activeBooking.payment_status !== 'completed'
              ? () => {
                  setIsViewModalOpen(false);
                  openEdit(activeBooking);
                }
              : undefined
          }
          onInvoice={(type) => {
            if (!activeBooking) return;
            setIsViewModalOpen(false);
            void handleGenerateInvoice(activeBooking.id, type);
          }}
          onCollectBalance={
            activeBooking && activeBooking.payment_status === 'partial' && (activeBooking.remaining_amount || 0) > 0
              ? () => setPayingBooking(activeBooking)
              : undefined
          }
        />

        <InfiniteScrollSentinel
          sentinelRef={sentinelRef}
          loadingMore={loadingMore}
          hasMore={hasMore}
          loaded={bookings.length}
          total={total}
        />

        {/* Booking Invoice Modal */}
        <BookingInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setInvoiceData(null);
          }}
          invoice={invoiceData}
        />
        <ConfirmModal
          isOpen={!!cancellingBooking}
          title="Cancel booking"
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          variant="danger"
          loading={cancelling}
          onClose={() => setCancellingBooking(null)}
          onConfirm={submitCancelBooking}
          description="The linked pending rental will cancel with it. This cannot be undone."
        />
        <ConfirmModal
          isOpen={!!payingBooking}
          title="Record full payment"
          confirmLabel="Take payment"
          loading={paying}
          onClose={() => setPayingBooking(null)}
          onConfirm={submitFullPayment}
          description={
            payingBooking ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p>Take the remaining balance on this booking?</p>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <div className="flex justify-between"><span>Paid</span><span className="tabular-nums">{formatCurrency(payingBooking.paid_amount || 0)}</span></div>
                  <div className="flex justify-between font-semibold text-slate-900"><span>Remaining</span><span className="tabular-nums">{formatCurrency(payingRemaining)}</span></div>
                </div>
              </div>
            ) : undefined
          }
        />
      </PageShell>
    </>
  );
}

type BookingFormState = {
  customer_id: string;
  booking_date: string;
  appointment_date?: string;
  booking_guarantee: string;
  booking_guarantee_other?: string;
  institution: BookingInstitution | '';
  notes?: string;
  status: Booking['status'];
  payment_status: Booking['payment_status'];
  payment_method: NonNullable<Booking['payment_method']>;
  items: BookingFormItem[];
};

function BookingFormFields({
  bookingForm,
  formErrors,
  selectedPackageId,
  packageOptions,
  discountId,
  discountCode,
  eligibleDiscounts,
  loadingDiscounts,
  bookingTotal,
  downPayment,
  locked,
  fetchCustomerOptions,
  fetchItemOptions,
  fetchTrousersOptions,
  updateBookingField,
  updateItemField,
  addItemLine,
  removeItemLine,
  handleSelectPackage,
  setDiscountId,
  setDiscountCode,
  setDownPayment,
}: {
  bookingForm: BookingFormState;
  formErrors: Record<string, string>;
  selectedPackageId: string;
  packageOptions: Array<{ value: string; label: string; price: number }>;
  discountId: string;
  discountCode: string;
  eligibleDiscounts: Discount[];
  loadingDiscounts: boolean;
  bookingTotal: number;
  downPayment: number;
  locked?: boolean;
  fetchCustomerOptions: (query: string) => Promise<{ value: string; label: string }[]>;
  fetchItemOptions: (query: string) => Promise<{ value: string; label: string }[]>;
  fetchTrousersOptions: (query: string) => Promise<{ value: string; label: string }[]>;
  updateBookingField: (field: keyof BookingFormState, value: string) => void;
  updateItemField: (index: number, field: keyof BookingFormItem, value: string | number | boolean) => void;
  addItemLine: (catalogue?: 'any' | 'trousers', isAddon?: boolean) => void;
  removeItemLine: (index: number) => void;
  handleSelectPackage: (pkgId: string) => void;
  setDiscountId: (id: string) => void;
  setDiscountCode: (code: string) => void;
  setDownPayment: (n: number) => void;
}) {
  // A discount that needs a code belongs to the customer who quotes it, so the
  // picker only offers the ones that apply on their own. Typing the code adds
  // that one discount to the list.
  const typedCode = discountCode.trim().toUpperCase();
  const codeMatch = typedCode
    ? eligibleDiscounts.find((discount) => (discount.code || '').toUpperCase() === typedCode)
    : undefined;
  const offeredDiscounts = eligibleDiscounts.filter(
    (discount) => !discount.requires_code || discount.id === codeMatch?.id,
  );
  const picked = offeredDiscounts.find((discount) => discount.id === discountId);
  const codeOnlyCount = eligibleDiscounts.length - offeredDiscounts.length;

  const discountHelperText = loadingDiscounts
    ? 'Checking which discounts fit…'
    : picked
      ? `Takes ${formatCurrency(discountAmountFor(picked, bookingTotal))} off when you save.`
      : offeredDiscounts.length > 0
        ? `${offeredDiscounts.length} discount${offeredDiscounts.length === 1 ? '' : 's'} fit this booking.`
        : bookingForm.customer_id
          ? 'No discount fits this customer and total yet.'
          : 'Pick the customer first to see their discounts.';

  const codeHelperText = !typedCode
    ? codeOnlyCount > 0
      ? `${codeOnlyCount} more discount${codeOnlyCount === 1 ? '' : 's'} unlock${codeOnlyCount === 1 ? 's' : ''} with a code.`
      : 'Type a code the customer quotes.'
    : codeMatch
      ? `${codeMatch.name} is now in the Discount list.`
      : 'No discount here matches that code.';

  return (
    <div className="space-y-6">
      <FieldGroup title="Customer">
        <AutoCompleteSelect
          label="Customer"
          value={bookingForm.customer_id}
          onChange={(val) => updateBookingField('customer_id', val)}
          fetchOptions={fetchCustomerOptions}
          error={formErrors.customer_id}
          placeholder="Search name or phone"
        />
      </FieldGroup>

      <FieldGroup title="Dates">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Booking date"
            type="date"
            value={bookingForm.booking_date}
            onChange={(e) => updateBookingField('booking_date', e.target.value)}
            error={formErrors.booking_date}
          />
          <Input
            label="Appointment date"
            type="date"
            value={bookingForm.appointment_date || ''}
            onChange={(e) => updateBookingField('appointment_date', e.target.value)}
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Items">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => addItemLine('trousers')} disabled={locked}>Add trousers</Button>
          {selectedPackageId && (
            <Button size="sm" variant="secondary" onClick={() => addItemLine('any', true)} disabled={locked}>Add add-on</Button>
          )}
          <Button size="sm" onClick={() => addItemLine()} disabled={locked}>Add item</Button>
        </div>
        <p className="text-xs text-slate-500">
          Trousers are a separate catalogue item. If the default pair does not fit, add or swap another pair.
          {selectedPackageId ? ' Mark extras as add-ons to charge them on top of the package.' : ''}
        </p>
        {formErrors.items && <div className="text-sm text-red-600">{formErrors.items}</div>}
        <div className="space-y-3">
          {bookingForm.items.map((it, idx) => {
            const packageLocked = !!selectedPackageId && !it.is_addon;
            return (
              <div key={idx} className="space-y-3 rounded-xl border border-black/10 bg-white p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <AutoCompleteSelect
                      label={it.catalogue === 'trousers' ? 'Trousers' : it.is_addon ? 'Add-on' : 'Item'}
                      value={it.item_id}
                      onChange={(val) => { if (!locked) updateItemField(idx, 'item_id', val); }}
                      fetchOptions={it.catalogue === 'trousers' ? fetchTrousersOptions : fetchItemOptions}
                      placeholder={it.catalogue === 'trousers' ? 'Search trousers' : 'Search items'}
                    />
                  </div>
                  <Button variant="ghost" size="sm" className="mt-7 shrink-0" onClick={() => removeItemLine(idx)} disabled={locked}>
                    Remove
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumberInput
                    label="Qty"
                    min={1}
                    value={it.quantity}
                    onChange={(n) => updateItemField(idx, 'quantity', n)}
                    error={formErrors[`item_qty_${idx}`]}
                    disabled={locked}
                  />
                  <CurrencyInput
                    label="Price"
                    value={it.unit_price}
                    onChange={(n) => updateItemField(idx, 'unit_price', n)}
                    disabled={packageLocked || locked}
                  />
                  <CurrencyInput
                    label="Discount"
                    value={it.discount_amount || 0}
                    onChange={(n) => updateItemField(idx, 'discount_amount', n)}
                    disabled={packageLocked || locked}
                  />
                </div>
                {selectedPackageId && (
                  <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={!!it.is_addon}
                      disabled={locked}
                      onChange={(e) => updateItemField(idx, 'is_addon', e.target.checked)}
                    />
                    Add-on — charge on top of the package
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </FieldGroup>

      <FieldGroup title="Payment">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            searchable={false}
            label="Payment method"
            value={bookingForm.payment_method}
            onChange={(e) => updateBookingField('payment_method', e.target.value)}
            options={[...BOOKING_PAYMENT_METHOD_OPTIONS]}
            disabled={locked}
          />
          <CurrencyInput
            label="Down payment"
            value={downPayment}
            onChange={setDownPayment}
            disabled={locked}
          />
          <Select
            label="Package"
            value={selectedPackageId}
            onChange={(e) => handleSelectPackage(e.target.value)}
            options={packageOptions.map((o) => ({ value: o.value, label: o.label }))}
            disabled={locked}
          />
        </div>

        {/* Only discounts this customer, this total and these items qualify
            for. The list comes from the backend, so anything offered here is
            accepted on save. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            searchable={false}
            label="Discount"
            value={discountId}
            onChange={(e) => setDiscountId(e.target.value)}
            disabled={locked || offeredDiscounts.length === 0}
            options={[
              { value: '', label: 'No discount' },
              ...offeredDiscounts.map((discount) => ({
                value: discount.id,
                label: discountOptionLabel(discount, bookingTotal),
              })),
            ]}
            helperText={discountHelperText}
          />
          <Input
            label="Discount code"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            placeholder="Only if the customer has one"
            disabled={locked}
            helperText={codeHelperText}
          />
        </div>
      </FieldGroup>

      <FieldGroup title="Details">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            searchable={false}
            label="Guarantee"
            value={bookingForm.booking_guarantee}
            onChange={(e) => updateBookingField('booking_guarantee', e.target.value)}
            options={[
              { value: 'KTP', label: 'KTP' },
              { value: 'Passport', label: 'Passport' },
              { value: 'Student ID', label: 'Student ID' },
              { value: 'Other', label: 'Other' },
            ]}
            error={formErrors.booking_guarantee}
          />
          {bookingForm.booking_guarantee === 'Other' && (
            <Input
              label="Other guarantee"
              value={bookingForm.booking_guarantee_other || ''}
              onChange={(e) => updateBookingField('booking_guarantee_other', e.target.value)}
              error={formErrors.booking_guarantee}
              placeholder="Enter guarantee type"
            />
          )}
          <Select
            searchable={false}
            label="Occasion"
            value={bookingForm.institution}
            onChange={(e) => updateBookingField('institution', e.target.value)}
            options={[
              { value: '', label: 'Unspecified' },
              ...BOOKING_OCCASION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
            ]}
            error={formErrors.institution}
          />
          <Select
            searchable={false}
            label="Status"
            value={bookingForm.status}
            onChange={(e) => updateBookingField('status', e.target.value)}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
            disabled={locked}
          />
          <Select
            searchable={false}
            label="Payment status"
            value={bookingForm.payment_status}
            onChange={(e) => updateBookingField('payment_status', e.target.value)}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'partial', label: 'Partial' },
              { value: 'completed', label: 'Completed' },
            ]}
            disabled={locked}
          />
        </div>
        <Textarea
          label="Notes"
          value={bookingForm.notes || ''}
          onChange={(e) => updateBookingField('notes', e.target.value)}
          placeholder="Optional"
          rows={2}
        />
      </FieldGroup>
    </div>
  );
}

function BookingFormTotals({
  selectedPackageId,
  packagePrice,
  addonSubtotal,
  bookingDiscount,
  bookingTotal,
  bookingFinal,
  downPayment,
  remainingAmount,
  submitError,
  loading,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  selectedPackageId: string;
  packagePrice: number;
  addonSubtotal: number;
  bookingDiscount: number;
  bookingTotal: number;
  bookingFinal: number;
  downPayment: number;
  remainingAmount: number;
  submitError?: string;
  loading: boolean;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-6 space-y-3 border-t border-black/5 pt-4">
      <div className="space-y-1 text-sm text-slate-600">
        {selectedPackageId ? (
          <div className="flex justify-between">
            <span>Package{addonSubtotal > 0 ? ' + add-ons' : ''}</span>
            <span className="tabular-nums">{formatCurrency(packagePrice + addonSubtotal)}</span>
          </div>
        ) : (
          <div className="flex justify-between">
            <span>Items</span>
            <span className="tabular-nums">{formatCurrency(bookingTotal)}</span>
          </div>
        )}
        {bookingDiscount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span className="tabular-nums">−{formatCurrency(bookingDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-slate-900">
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(bookingFinal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Down payment</span>
          <span className="tabular-nums">{formatCurrency(downPayment)}</span>
        </div>
        <div className="flex justify-between">
          <span>Remaining</span>
          <span className="tabular-nums">{formatCurrency(remainingAmount)}</span>
        </div>
      </div>
      {submitError && <div className="text-sm text-red-600">{submitError}</div>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} loading={loading}>{submitLabel}</Button>
      </div>
    </div>
  );
}