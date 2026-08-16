'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import ClientOnly from '@/components/ClientOnly';
import { apiClient } from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import SimpleModal from '@/components/modals/SimpleModal';
import { formatCurrency } from '@/lib/currency';
import { formatDateShort } from '@/lib/date';
import { BOOKING_PAYMENT_METHOD_OPTIONS, formatPaymentMethod } from '@/lib/payment-methods';
import { BOOKING_OCCASION_OPTIONS } from '@/lib/select-options';
import { Booking, BookingFilters, BookingInstitution, InvoiceData, Customer, Item, PackagePricing } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { customerOptionLabel } from '@/lib/branch-scope';
import AutoCompleteSelect from '@/components/ui/AutoCompleteSelect';
import { Plus, Edit, Calendar, Eye, FileText, Download, ShoppingBag, CreditCard } from 'lucide-react';
import { BookingInvoiceModal } from '@/components/modals/BookingInvoiceModal';
import { BookingDetailsModal } from '@/components/modals/BookingDetailsModal';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, Pagination, SkeletonRow, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
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
    return line.quantity > 1 ? `${name} ×${line.quantity}` : name;
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
  const { warning } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BookingFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [packageOptions, setPackageOptions] = useState<Array<{ value: string; label: string; price: number }>>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [downPayment, setDownPayment] = useState(0);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
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
        alert('User not authenticated. Please login again.');
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
      const code = discountCode.trim();
      if (created?.id && code) {
        try {
          const discount = await apiClient.validateDiscountCode(code, created.id);
          await apiClient.applyDiscountToBooking(discount.id, created.id);
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
      setDiscountCode('');
      setDownPayment(0);
      await loadBookings();
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
      const code = discountCode.trim();
      if (activeBooking.id && code) {
        try {
          const discount = await apiClient.validateDiscountCode(code, activeBooking.id);
          await apiClient.applyDiscountToBooking(discount.id, activeBooking.id);
        } catch (err) {
          warning('Discount not applied', apiErrorMessage(err, 'This discount is not available for this customer.'));
        }
      }
      setIsEditModalOpen(false);
      setActiveBooking(null);
      setDiscountCode('');
      setDownPayment(0);
      await loadBookings();
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

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getBookings({ ...filters, page: currentPage, limit: itemsPerPage });
      const list = response?.data?.data?.bookings || [];
      const pagination = response?.data?.pagination;
      setBookings(Array.isArray(list) ? list : []);
      setTotal(pagination?.total || 0);
      setTotalPages(pagination?.total_pages || 1);
    } catch {
      warning('Unable to load bookings', 'Backend may be offline. Please try again.');
      setBookings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, warning]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleSearch = (search: string) => {
    setSearchInput(search);
  };

  // Debounce search to reduce API calls
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput || undefined }));
      setCurrentPage(1);
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
      
      // invoice data used for modal / download
      
      // Validate invoice data
      if (!invoice) {
        throw new Error('No invoice data received from server');
      }
      
      if (!invoice.items || !Array.isArray(invoice.items)) {
        console.warn('Invoice items is null or not an array:', invoice.items);
        // Set empty array as fallback
        invoice.items = [];
      }
      
      // Show invoice in thermal printer modal
      setInvoiceData(invoice);
      setShowInvoiceModal(true);
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const handleMakeFullPayment = async (bookingId: string) => {
    try {
      // Find the booking to get the final amount
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Calculate the full payment amount (final amount after discount)
      const finalAmount = (booking.total_amount || 0) - (booking.discount_amount || 0);
      
      // Confirm the payment
      const confirmed = confirm(
        `Make full payment of ${formatCurrency(finalAmount)}?\n\n` +
        `Current paid: ${formatCurrency(booking.paid_amount || 0)}\n` +
        `Remaining: ${formatCurrency(booking.remaining_amount || 0)}`
      );
      
      if (!confirmed) return;

      const remaining = booking.remaining_amount || Math.max(0, finalAmount - (booking.paid_amount || 0));
      if (remaining <= 0) {
        alert('This booking is already fully paid.');
        return;
      }
      await apiClient.addPayment(
        bookingId,
        remaining,
        booking.payment_method || 'cash',
        new Date().toISOString().slice(0, 10)
      );

      // Refresh the bookings list
      await loadBookings();
      
      // Show success message
      alert('Full payment completed successfully!');
      
    } catch (error) {
      console.error('Failed to make full payment:', error);
      alert('Failed to make full payment. Please try again.');
    }
  };

  // Rental creation is handled exclusively from the Rentals menu for UI simplicity

  return (
    <DashboardLayout>
      <PageShell
        title="Bookings"
        subtitle="Manage customer bookings and reservations"
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/cashier">
              <Button size="md" variant="secondary">Cashier POS</Button>
            </Link>
            <Button size="md" onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4" />
              New Booking
            </Button>
          </div>
        }
      >
        <ClientOnly>
          <FilterBar>
            <Input
              placeholder="Search bookings..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
            />
            <Select
              searchable={false}
              options={statusOptions}
              value={filters.status || ''}
              onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value || undefined })); setCurrentPage(1); }}
            />
            <Select
              searchable={false}
              options={paymentStatusOptions}
              value={filters.payment_status || ''}
              onChange={(e) => { setFilters(prev => ({ ...prev, payment_status: e.target.value || undefined })); setCurrentPage(1); }}
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
              action={<Button onClick={() => setIsCreateModalOpen(true)}><Plus className="h-4 w-4" /> New Booking</Button>}
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
                <Card key={booking.id} padding="sm" className="relative z-0 [&:has(details[open])]:z-30">
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
                          <OverflowMenuItem icon={<CreditCard className="h-4 w-4 text-slate-400" />} onClick={() => handleMakeFullPayment(booking.id)}>
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
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AutoCompleteSelect
                label="Customer"
                value={bookingForm.customer_id}
                onChange={(val) => updateBookingField('customer_id', val)}
                fetchOptions={fetchCustomerOptions}
                error={formErrors.customer_id}
                placeholder="Search customers (2+ chars)"
              />
              <Input label="Booking Date" type="date" value={bookingForm.booking_date} onChange={(e) => updateBookingField('booking_date', e.target.value)} error={formErrors.booking_date} />
              <Input label="Appointment Date" type="date" value={bookingForm.appointment_date || ''} onChange={(e) => updateBookingField('appointment_date', e.target.value)} />
              <Select
                searchable={false}
                label="Booking Guarantee"
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
                  label="Other Guarantee"
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
              <Input label="Notes" value={bookingForm.notes || ''} onChange={(e) => updateBookingField('notes', e.target.value)} />
              <Select
                label="Package (optional)"
                value={selectedPackageId}
                onChange={(e) => handleSelectPackage(e.target.value)}
                options={packageOptions.map(o => ({ value: o.value, label: o.label }))}
              />
              <Select searchable={false} label="Status" value={bookingForm.status} onChange={(e) => updateBookingField('status', e.target.value)} options={[
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} />
              <Select searchable={false} label="Payment Status" value={bookingForm.payment_status} onChange={(e) => updateBookingField('payment_status', e.target.value)} options={[
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'completed', label: 'Completed' },
              ]} />
              <Select
                searchable={false}
                label="Payment Method"
                value={bookingForm.payment_method}
                onChange={(e) => updateBookingField('payment_method', e.target.value)}
                options={[...BOOKING_PAYMENT_METHOD_OPTIONS]}
              />
              <Input label="Discount Code (optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Enter code" />
              <CurrencyInput label="Down Payment" value={downPayment} onChange={setDownPayment} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium">Items</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => addItemLine('trousers')}>Add trousers</Button>
                  {selectedPackageId && (
                    <Button size="sm" variant="secondary" onClick={() => addItemLine('any', true)}>Add add-on</Button>
                  )}
                  <Button size="sm" onClick={() => addItemLine()}>Add Item</Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Trousers are a separate catalogue item. If the default pair does not fit, add or swap another pair.
                {selectedPackageId ? ' Mark extras as add-ons to charge them on top of the package.' : ''}
              </p>
              {formErrors.items && <div className="text-sm text-red-600">{formErrors.items}</div>}
              <div className="space-y-3">
                {bookingForm.items.map((it, idx) => {
                  const packageLocked = !!selectedPackageId && !it.is_addon;
                  return (
                  <div key={idx} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <AutoCompleteSelect
                        label={it.catalogue === 'trousers' ? 'Trousers' : it.is_addon ? 'Add-on' : 'Item'}
                        value={it.item_id}
                        onChange={(val) => updateItemField(idx, 'item_id', val)}
                        fetchOptions={it.catalogue === 'trousers' ? fetchTrousersOptions : fetchItemOptions}
                        placeholder={it.catalogue === 'trousers' ? 'Search trousers (2+ chars)' : 'Search items (2+ chars)'}
                      />
                    </div>
                    <div className="col-span-2"><Input label="Qty" type="number" value={String(it.quantity)} onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))} error={formErrors[`item_qty_${idx}`]} /></div>
                    <div className="col-span-3"><CurrencyInput label="Unit Price" value={it.unit_price} onChange={(n) => updateItemField(idx, 'unit_price', n)} disabled={packageLocked} /></div>
                    <div className="col-span-2"><CurrencyInput label="Discount" value={it.discount_amount || 0} onChange={(n) => updateItemField(idx, 'discount_amount', n)} disabled={packageLocked} /></div>
                    <div className="col-span-1 flex justify-end"><Button variant="ghost" size="sm" onClick={() => removeItemLine(idx)}>X</Button></div>
                    </div>
                    {selectedPackageId && (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!it.is_addon}
                          onChange={(e) => updateItemField(idx, 'is_addon', e.target.checked)}
                        />
                        Add-on — charge this line on top of the package
                      </label>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-700">
              <div>
                {selectedPackageId ? (
                  <>
                    Package: {formatCurrency(packagePrice)}
                    {addonSubtotal > 0 ? ` + Add-ons: ${formatCurrency(addonSubtotal)}` : ''}
                    {bookingDiscount > 0 ? ` | Discount: ${formatCurrency(bookingDiscount)}` : ''}
                    {' '}· Total: {formatCurrency(bookingFinal)}
                  </>
                ) : (
                  <>Total: {formatCurrency(bookingTotal)} | Discount: {formatCurrency(bookingDiscount)} | Final: {formatCurrency(bookingFinal)}</>
                )}
                <br />
                Down Payment: {formatCurrency(downPayment)} | Remaining: {formatCurrency(remainingAmount)}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button onClick={submitCreateBooking} loading={creating}>Create</Button>
              </div>
            </div>
            {formErrors.submit && <div className="text-sm text-red-600">{formErrors.submit}</div>}
          </div>
        </SimpleModal>

        {/* Edit Booking Modal */}
        <SimpleModal
          isOpen={isEditModalOpen}
          title="Edit Booking"
          onClose={() => { setIsEditModalOpen(false); setActiveBooking(null); }}
        >
          <div className="space-y-4">
            {/* Reuse same form controls as create */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AutoCompleteSelect label="Customer" value={bookingForm.customer_id} onChange={(val) => updateBookingField('customer_id', val)} fetchOptions={fetchCustomerOptions} error={formErrors.customer_id} placeholder="Search customers (2+ chars)" />
              <Input label="Booking Date" type="date" value={bookingForm.booking_date} onChange={(e) => updateBookingField('booking_date', e.target.value)} error={formErrors.booking_date} />
              <Input label="Appointment Date" type="date" value={bookingForm.appointment_date || ''} onChange={(e) => updateBookingField('appointment_date', e.target.value)} />
              <Select
                searchable={false}
                label="Booking Guarantee"
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
                  label="Other Guarantee"
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
              <Input label="Notes" value={bookingForm.notes || ''} onChange={(e) => updateBookingField('notes', e.target.value)} />
              <Select label="Package (optional)" value={selectedPackageId} onChange={(e) => handleSelectPackage(e.target.value)} options={packageOptions.map(o => ({ value: o.value, label: o.label }))} disabled={activeBooking?.payment_status === 'completed'} />
              <Select searchable={false} label="Status" value={bookingForm.status} onChange={(e) => updateBookingField('status', e.target.value)} options={[{ value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} disabled={activeBooking?.payment_status === 'completed'} />
              <Select searchable={false} label="Payment Status" value={bookingForm.payment_status} onChange={(e) => updateBookingField('payment_status', e.target.value)} options={[{ value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'completed', label: 'Completed' }]} disabled={activeBooking?.payment_status === 'completed'} />
              <Select
                searchable={false}
                label="Payment Method"
                value={bookingForm.payment_method}
                onChange={(e) => updateBookingField('payment_method', e.target.value)}
                options={[...BOOKING_PAYMENT_METHOD_OPTIONS]}
                disabled={activeBooking?.payment_status === 'completed'}
              />
              <Input label="Discount Code (optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Enter code" disabled={activeBooking?.payment_status === 'completed'} />
              <CurrencyInput label="Down Payment" value={downPayment} onChange={setDownPayment} disabled={activeBooking?.payment_status === 'completed'} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-medium">Items</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => addItemLine('trousers')} disabled={activeBooking?.payment_status === 'completed'}>Add trousers</Button>
                  {selectedPackageId && (
                    <Button size="sm" variant="secondary" onClick={() => addItemLine('any', true)} disabled={activeBooking?.payment_status === 'completed'}>Add add-on</Button>
                  )}
                  <Button size="sm" onClick={() => addItemLine()} disabled={activeBooking?.payment_status === 'completed'}>Add Item</Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Trousers are a separate catalogue item. If the default pair does not fit, add or swap another pair.
                {selectedPackageId ? ' Mark extras as add-ons to charge them on top of the package.' : ''}
              </p>
              {formErrors.items && <div className="text-sm text-red-600">{formErrors.items}</div>}
              <div className="space-y-3">
                {bookingForm.items.map((it, idx) => {
                  const locked = activeBooking?.payment_status === 'completed';
                  const packageLocked = !!selectedPackageId && !it.is_addon;
                  return (
                  <div key={idx} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4"><AutoCompleteSelect label={it.catalogue === 'trousers' ? 'Trousers' : it.is_addon ? 'Add-on' : 'Item'} value={it.item_id} onChange={(val) => { if (!locked) updateItemField(idx, 'item_id', val); }} fetchOptions={it.catalogue === 'trousers' ? fetchTrousersOptions : fetchItemOptions} placeholder={it.catalogue === 'trousers' ? 'Search trousers (2+ chars)' : 'Search items (2+ chars)'} /></div>
                    <div className="col-span-2"><Input label="Qty" type="number" value={String(it.quantity)} onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))} disabled={locked} /></div>
                    <div className="col-span-3"><CurrencyInput label="Unit Price" value={it.unit_price} onChange={(n) => updateItemField(idx, 'unit_price', n)} disabled={packageLocked || locked} /></div>
                    <div className="col-span-2"><CurrencyInput label="Discount" value={it.discount_amount || 0} onChange={(n) => updateItemField(idx, 'discount_amount', n)} disabled={packageLocked || locked} /></div>
                    <div className="col-span-1 flex justify-end"><Button variant="ghost" size="sm" onClick={() => removeItemLine(idx)}>X</Button></div>
                    </div>
                    {selectedPackageId && (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!it.is_addon}
                          disabled={locked}
                          onChange={(e) => updateItemField(idx, 'is_addon', e.target.checked)}
                        />
                        Add-on — charge this line on top of the package
                      </label>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-700">
              <div>
                {selectedPackageId ? (
                  <>
                    Package: {formatCurrency(packagePrice)}
                    {addonSubtotal > 0 ? ` + Add-ons: ${formatCurrency(addonSubtotal)}` : ''}
                    {bookingDiscount > 0 ? ` | Discount: ${formatCurrency(bookingDiscount)}` : ''}
                    {' '}· Total: {formatCurrency(bookingFinal)}
                  </>
                ) : (
                  <>Total: {formatCurrency(bookingTotal)} | Discount: {formatCurrency(bookingDiscount)} | Final: {formatCurrency(bookingFinal)}</>
                )}
                <br />
                Down Payment: {formatCurrency(downPayment)} | Remaining: {formatCurrency(remainingAmount)}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setIsEditModalOpen(false); setActiveBooking(null); }}>Cancel</Button>
                <Button onClick={submitEditBooking} loading={creating}>Save</Button>
              </div>
            </div>
            {formErrors.submit && <div className="text-sm text-red-600">{formErrors.submit}</div>}
          </div>
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
              ? () => { void handleMakeFullPayment(activeBooking.id); }
              : undefined
          }
        />

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={total}
          perPage={itemsPerPage}
          onPageChange={setCurrentPage}
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
      </PageShell>
    </DashboardLayout>
  );
}