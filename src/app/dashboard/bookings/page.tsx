'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import ClientOnly from '@/components/ClientOnly';
import { apiClient } from '@/lib/api';
import SimpleModal from '@/components/modals/SimpleModal';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Booking, BookingFilters, InvoiceData, Customer, Item, PackagePricing } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import AutoCompleteSelect from '@/components/ui/AutoCompleteSelect';
import { Plus, Edit, Calendar, User, DollarSign, Clock, Filter, Eye, FileText, Download, Shirt } from 'lucide-react';
import { BookingInvoiceModal } from '@/components/modals/BookingInvoiceModal';

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<BookingFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
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
    notes?: string;
    status: Booking['status'];
    payment_status: Booking['payment_status'];
    payment_method: NonNullable<Booking['payment_method']>;
    items: Array<{ item_id: string; quantity: number; unit_price: number; discount_amount?: number }>;
  }>({
    customer_id: '',
    booking_date: new Date().toISOString().slice(0, 10),
    status: 'pending',
    payment_status: 'pending',
    payment_method: 'dp_transfer',
    items: [
      { item_id: '', quantity: 1, unit_price: 0, discount_amount: 0 }
    ],
  });

  const selectedPackage = packageOptions.find(p => p.value === selectedPackageId);
  const packagePrice = selectedPackage?.price || 0;
  const itemsSubtotal = bookingForm.items.reduce((sum, it) => sum + (it.unit_price * it.quantity), 0);
  const itemsDiscount = bookingForm.items.reduce((sum, it) => sum + (it.discount_amount || 0), 0);
  const bookingTotal = packagePrice > 0 ? packagePrice : itemsSubtotal;
  const bookingDiscount = packagePrice > 0 ? 0 : itemsDiscount;
  const bookingFinal = bookingTotal - bookingDiscount;
  const remainingAmount = bookingFinal - downPayment;

  const updateBookingField = (field: keyof typeof bookingForm, value: string) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateItemField = (index: number, field: keyof (typeof bookingForm)['items'][number], value: string | number) => {
    setBookingForm(prev => {
      const items = prev.items.map((it, i) => i === index ? { ...it, [field]: typeof value === 'string' ? (field === 'item_id' ? value : Number(value)) : value } : it);
      return { ...prev, items };
    });
  };

  // Auto-fill item unit price when item_id selected (with cache to avoid repeated calls)
  const itemPriceCacheRef = useRef<Map<string, number>>(new Map());
  const itemIdsKey = useMemo(() => Array.from(new Set(bookingForm.items.map(it => it.item_id).filter(Boolean))).sort().join(','), [bookingForm.items]);
  useEffect(() => {
    const fillPrices = async () => {
      try {
        const uniqueIds = itemIdsKey ? itemIdsKey.split(',').filter(Boolean) : [];
        if (uniqueIds.length === 0) return;
        const idsToFetch = uniqueIds.filter(id => !itemPriceCacheRef.current.has(id));
        if (idsToFetch.length > 0) {
          await Promise.all(idsToFetch.map(async (id) => {
            try {
              const item = await apiClient.getItem(id);
              const price = item?.standard_price ?? item?.one_day_price ?? 0;
              itemPriceCacheRef.current.set(id, price);
            } catch {}
          }));
        }
        setBookingForm(prev => ({
          ...prev,
          items: prev.items.map(it => it.item_id && (!it.unit_price || it.unit_price === 0)
            ? { ...it, unit_price: itemPriceCacheRef.current.get(it.item_id) || 0 }
            : it)
        }));
      } catch {}
    };
    fillPrices();
  }, [itemIdsKey]);

  const addItemLine = () => {
    setBookingForm(prev => ({ ...prev, items: [...prev.items, { item_id: '', quantity: 1, unit_price: 0, discount_amount: 0 }] }));
  };

  const removeItemLine = (index: number) => {
    setBookingForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const submitCreateBooking = async () => {
    // basic validation
    const errs: Record<string, string> = {};
    if (!bookingForm.customer_id) errs.customer_id = 'Customer ID is required';
    if (!bookingForm.booking_date) errs.booking_date = 'Booking date is required';
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
        })),
      } as unknown as import('@/types').CreateBookingRequest;

      const created = await apiClient.createBooking(payload as unknown as import('@/types').CreateBookingRequest);
      // Apply discount code if provided
      const code = discountCode.trim();
      if (created?.id && code) {
        try {
          const discount = await apiClient.getDiscountByCode(code);
          if (discount?.id) {
            await apiClient.applyDiscountToBooking(discount.id, created.id);
          }
        } catch (err) {
          console.warn('Failed to apply discount code:', err);
        }
      }
      setIsCreateModalOpen(false);
      setBookingForm({
        customer_id: '',
        booking_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'dp_transfer',
        items: [{ item_id: '', quantity: 1, unit_price: 0, discount_amount: 0 }],
      });
      setDiscountCode('');
      setDownPayment(0);
      await loadBookings();
    } catch (e) {
      console.error('Create booking failed', e);
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (booking: Booking) => {
    setActiveBooking(booking);
    setBookingForm({
      customer_id: booking.customer_id,
      booking_date: booking.booking_date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      appointment_date: booking.appointment_date?.slice(0, 10),
      notes: booking.notes || '',
      status: booking.status,
      payment_status: booking.payment_status,
      payment_method: (booking.payment_method || 'dp_transfer') as NonNullable<Booking['payment_method']>,
      items: (booking.items || []).map(it => ({
        item_id: it.item_id,
        quantity: it.quantity,
        unit_price: it.unit_price || it.final_price || 0,
        discount_amount: it.discount_amount || 0,
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
          }
        : {
            customer_id: bookingForm.customer_id,
            booking_date: new Date(bookingForm.booking_date).toISOString(),
            appointment_date: bookingForm.appointment_date ? new Date(bookingForm.appointment_date).toISOString() : undefined,
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
            })),
          }
      ) as unknown as import('@/types').CreateBookingRequest;

      await apiClient.updateBooking(activeBooking.id, payload as unknown as Partial<import('@/types').CreateBookingRequest>);
      // Apply discount code if provided
      const code = discountCode.trim();
      if (activeBooking.id && code) {
        try {
          const discount = await apiClient.getDiscountByCode(code);
          if (discount?.id) {
            await apiClient.applyDiscountToBooking(discount.id, activeBooking.id);
          }
        } catch (err) {
          console.warn('Failed to apply discount code:', err);
        }
      }
      setIsEditModalOpen(false);
      setActiveBooking(null);
      setDiscountCode('');
      setDownPayment(0);
      await loadBookings();
    } catch (e) {
      console.error('Update booking failed', e);
    } finally {
      setCreating(false);
    }
  };

  // Options are fetched via SearchSelect on demand

  const fetchCustomerOptions = async (query: string) => {
    if (query && query.trim().length >= 2) {
      const results = await apiClient.searchCustomers(query.trim());
      return results.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} • ${c.email}` }));
    }
    const customersRes = await apiClient.getCustomers({ page: 1, limit: 50 });
    const customers = customersRes?.data?.data?.customers as Customer[] || [];
    return customers.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name} • ${c.email}` }));
  };

  const fetchItemOptions = async (query: string) => {
    if (query && query.trim().length >= 2) {
      const results = await apiClient.searchItems(query.trim());
      return results.map((it) => ({ value: it.id, label: `${it.name} (${it.code})` }));
    }
    const itemsRes = await apiClient.getItems();
    const items = itemsRes?.data?.data?.items as Item[] || [];
    return items.map((it) => ({ value: it.id, label: `${it.name} (${it.code})` }));
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
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setBookings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage]);

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

  // Pagination helpers
  const goToPrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      
      // Debug: Log the invoice data to help identify issues
      console.log('Invoice data received:', invoice);
      
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

      // Update the booking with full payment
      await apiClient.updateBooking(bookingId, {
        paid_amount: finalAmount,
        payment_status: 'completed',
        remaining_amount: 0
      });

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
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage customer bookings and reservations
            </p>
          </div>
          <Button size="lg" fullWidth className="sm:w-auto" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search bookings..."
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          
          <Button
            variant="ghost"
            size="md"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
          <Card>
            <CardContent>
              <ClientOnly>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Select
                    label="Status"
                    options={statusOptions}
                    value={filters.status || ''}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                  />
                  <Select
                    label="Payment Status"
                    options={paymentStatusOptions}
                    value={filters.payment_status || ''}
                    onChange={(e) => setFilters({ ...filters, payment_status: e.target.value || undefined })}
                  />
                </div>
              </ClientOnly>
            </CardContent>
          </Card>
        </div>

        {/* Bookings List */}
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : bookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
                <p className="text-gray-500 mb-4">
                  {Object.values(filters).some(v => v)
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first booking'}
                </p>
                <Button size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
              </CardContent>
            </Card>
          ) : (
            (Array.isArray(bookings) ? bookings : []).map((booking) => (
              <Card key={booking.id}>
                <CardContent className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">
                          Booking #{booking.id.slice(-8)}
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                          {booking.payment_status}
                        </span>
                      </div>
                      {booking.customer && (
                        <div className="flex items-center text-sm text-gray-600">
                          <User className="h-4 w-4 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium">{booking.customer.first_name} {booking.customer.last_name}</span>
                            <div className="text-xs text-gray-500 truncate sm:inline sm:ml-2">
                              {booking.customer.email}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <User className="h-3 w-3 mr-1" />
                        <span>
                          Staff created: {booking.creator ? `${booking.creator.first_name} ${booking.creator.last_name}` : 'Unknown'}
                        </span>
                      </div>
                      {booking.updater && (
                        <div className="flex items-center text-xs text-gray-500">
                          <User className="h-3 w-3 mr-1" />
                          <span>Staff updated: {booking.updater.first_name} {booking.updater.last_name}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency((booking.total_amount || 0) - (booking.discount_amount || 0))}
                      </div>
                      {booking.discount_amount > 0 && (
                        <div className="text-sm text-green-600">
                          -{formatCurrency(booking.discount_amount)} discount
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Dates</div>
                        <div className="text-xs">{formatDate(booking.booking_date)}{booking.appointment_date ? ` - ${formatDate(booking.appointment_date)}` : ''}</div>
                      </div>
                    </div>
                    {booking.appointment_date && (
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Days to Appointment</div>
                          <div className="text-xs">
                            {Math.max(0, Math.ceil((new Date(booking.appointment_date).getTime() - new Date(booking.booking_date).getTime()) / (1000 * 60 * 60 * 24)))} days
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium">{booking.package_pricing_id ? 'Package Total' : 'Total'}</div>
                        <div className="text-xs">{formatCurrency(booking.package_pricing?.price || booking.total_amount)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Rental Information */}
                  {booking.rental && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm text-blue-800 mb-3">
                        <div className="flex items-center">
                          <Shirt className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="font-medium">Rental Details</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-700 font-medium">Status:</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            booking.rental.status === 'active' ? 'bg-green-100 text-green-800' :
                            booking.rental.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            booking.rental.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            booking.rental.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.rental.status.charAt(0).toUpperCase() + booking.rental.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-blue-700 font-medium">Rental Period:</span>
                          <div className="text-blue-600 mt-1">
                            {formatDate(booking.rental.rental_date)} - {formatDate(booking.rental.return_date)}
                          </div>
                        </div>
                        {booking.rental.status === 'active' && (
                          <div>
                            <span className="text-blue-700 font-medium">Days Remaining:</span>
                            <div className="text-blue-600 font-semibold mt-1">
                              {Math.max(0, Math.ceil((new Date(booking.rental.return_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} days
                            </div>
                          </div>
                        )}
                        {booking.rental.status === 'overdue' && (
                          <div>
                            <span className="text-red-700 font-medium">Days Overdue:</span>
                            <div className="text-red-600 font-semibold mt-1">
                              {Math.max(0, Math.ceil((new Date().getTime() - new Date(booking.rental.return_date).getTime()) / (1000 * 60 * 60 * 24)))} days
                            </div>
                          </div>
                        )}
                        {booking.rental.actual_pickup_date && (
                          <div>
                            <span className="text-blue-700 font-medium">Picked Up:</span>
                            <div className="text-blue-600 mt-1">{formatDate(booking.rental.actual_pickup_date)}</div>
                          </div>
                        )}
                        {booking.rental.actual_return_date && (
                          <div>
                            <span className="text-blue-700 font-medium">Returned:</span>
                            <div className="text-blue-600 mt-1">{formatDate(booking.rental.actual_return_date)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Items Summary */}
                  {booking.items && booking.items.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Items ({booking.items.length})
                      </h4>
                      <div className="space-y-1">
                        {booking.items.slice(0, 2).map((item) => (
                          <div key={item.id} className="text-sm text-gray-600 flex justify-between">
                            <span className="truncate flex-1 mr-2">
                              {item.item?.name} (×{item.quantity})
                            </span>
                            {!booking.package_pricing_id && (
                              <span className="font-medium">{formatCurrency(item.final_price)}</span>
                            )}
                          </div>
                        ))}
                        {booking.items.length > 2 && (
                          <div className="text-sm text-gray-500">
                            +{booking.items.length - 2} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {booking.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Notes</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{booking.notes}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter>
                  <div className="flex justify-between items-center w-full">
                    <div className="text-xs text-gray-500">
                      Created: {formatDate(booking.created_at)}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(booking)} disabled={booking.payment_status === 'completed'}>
                        <Edit className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setActiveBooking(booking); setIsViewModalOpen(true); }}>
                        <Eye className="h-4 w-4 sm:mr-1" />
                        <span className="hidden sm:inline">View</span>
                      </Button>
                      {/* Dynamic Invoice Buttons based on Payment Status */}
                      {booking.payment_status === 'pending' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleGenerateInvoice(booking.id, 'dp')}
                          title="Generate Down Payment Invoice"
                        >
                          <FileText className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">DP Invoice</span>
                        </Button>
                      )}
                      {(booking.payment_status === 'partial' || booking.payment_status === 'completed') && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleGenerateInvoice(booking.id, 'full')}
                          title="Generate Full Payment Invoice"
                        >
                          <Download className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">Full Invoice</span>
                        </Button>
                      )}
                      {booking.payment_status === 'partial' && booking.paid_amount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleGenerateInvoice(booking.id, 'dp')}
                          title="Generate Down Payment Invoice"
                        >
                          <FileText className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">DP Invoice</span>
                        </Button>
                      )}
                      {booking.payment_status === 'partial' && booking.remaining_amount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleMakeFullPayment(booking.id)}
                          title="Make Full Payment"
                          className="text-green-600 hover:text-green-700"
                        >
                          <span className="h-4 w-4 sm:mr-1">💰</span>
                          <span className="hidden sm:inline">Full Payment</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardFooter>
              </Card>
            ))
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
              <Input label="Notes" value={bookingForm.notes || ''} onChange={(e) => updateBookingField('notes', e.target.value)} />
              <Select
                label="Package (optional)"
                value={selectedPackageId}
                onChange={(e) => handleSelectPackage(e.target.value)}
                options={packageOptions.map(o => ({ value: o.value, label: o.label }))}
              />
              <Select label="Status" value={bookingForm.status} onChange={(e) => updateBookingField('status', e.target.value)} options={[
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]} />
              <Select label="Payment Status" value={bookingForm.payment_status} onChange={(e) => updateBookingField('payment_status', e.target.value)} options={[
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'completed', label: 'Completed' },
              ]} />
              <Select label="Payment Method" value={bookingForm.payment_method} onChange={(e) => updateBookingField('payment_method', e.target.value)} options={[
                { value: 'dp_cash', label: 'DP Cash' },
                { value: 'full_cash', label: 'Full Cash' },
                { value: 'dp_transfer', label: 'DP Transfer' },
                { value: 'full_transfer', label: 'Full Transfer' },
              ]} />
              <Input label="Discount Code (optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Enter code" />
              <Input label="Down Payment" type="number" value={String(downPayment)} onChange={(e) => setDownPayment(Number(e.target.value))} placeholder="Enter amount" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Items</h4>
                <Button size="sm" onClick={addItemLine}>Add Item</Button>
              </div>
              {formErrors.items && <div className="text-sm text-red-600">{formErrors.items}</div>}
              <div className="space-y-3">
                {bookingForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <AutoCompleteSelect
                        label="Item"
                        value={it.item_id}
                        onChange={(val) => updateItemField(idx, 'item_id', val)}
                        fetchOptions={fetchItemOptions}
                        placeholder="Search items (2+ chars)"
                      />
                    </div>
                    <div className="col-span-2"><Input label="Qty" type="number" value={String(it.quantity)} onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))} error={formErrors[`item_qty_${idx}`]} /></div>
                    <div className="col-span-3"><Input label="Unit Price" type="number" value={String(it.unit_price)} onChange={(e) => updateItemField(idx, 'unit_price', Number(e.target.value))} disabled={!!selectedPackageId} /></div>
                    <div className="col-span-2"><Input label="Discount" type="number" value={String(it.discount_amount || 0)} onChange={(e) => updateItemField(idx, 'discount_amount', Number(e.target.value))} disabled={!!selectedPackageId} /></div>
                    <div className="col-span-1 flex justify-end"><Button variant="ghost" size="sm" onClick={() => removeItemLine(idx)}>X</Button></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-700">
              <div>
                {selectedPackageId ? (
                  <>Package Total: {formatCurrency(bookingTotal)}</>
                ) : (
                  <>Total: {formatCurrency(bookingTotal)}</>
                )}
                {selectedPackageId ? null : (
                  <> | Discount: {formatCurrency(bookingDiscount)} | Final: {formatCurrency(bookingFinal)}</>
                )}
                <br />
                Down Payment: {formatCurrency(downPayment)} | Remaining: {formatCurrency(remainingAmount)}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                <Button onClick={submitCreateBooking} loading={creating}>Create</Button>
              </div>
            </div>
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
              <Input label="Notes" value={bookingForm.notes || ''} onChange={(e) => updateBookingField('notes', e.target.value)} />
              <Select label="Package (optional)" value={selectedPackageId} onChange={(e) => handleSelectPackage(e.target.value)} options={packageOptions.map(o => ({ value: o.value, label: o.label }))} disabled={activeBooking?.payment_status === 'completed'} />
              <Select label="Status" value={bookingForm.status} onChange={(e) => updateBookingField('status', e.target.value)} options={[{ value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' }, { value: 'active', label: 'Active' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }]} disabled={activeBooking?.payment_status === 'completed'} />
              <Select label="Payment Status" value={bookingForm.payment_status} onChange={(e) => updateBookingField('payment_status', e.target.value)} options={[{ value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }, { value: 'completed', label: 'Completed' }]} disabled={activeBooking?.payment_status === 'completed'} />
              <Select label="Payment Method" value={bookingForm.payment_method} onChange={(e) => updateBookingField('payment_method', e.target.value)} options={[{ value: 'dp_cash', label: 'DP Cash' }, { value: 'full_cash', label: 'Full Cash' }, { value: 'dp_transfer', label: 'DP Transfer' }, { value: 'full_transfer', label: 'Full Transfer' }              ]} disabled={activeBooking?.payment_status === 'completed'} />
              <Input label="Discount Code (optional)" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Enter code" disabled={activeBooking?.payment_status === 'completed'} />
              <Input label="Down Payment" type="number" value={String(downPayment)} onChange={(e) => setDownPayment(Number(e.target.value))} placeholder="Enter amount" disabled={activeBooking?.payment_status === 'completed'} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Items</h4>
                <Button size="sm" onClick={addItemLine}>Add Item</Button>
              </div>
              {formErrors.items && <div className="text-sm text-red-600">{formErrors.items}</div>}
              <div className="space-y-3">
                {bookingForm.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4"><AutoCompleteSelect label="Item" value={it.item_id} onChange={(val) => { if (activeBooking?.payment_status !== 'completed') updateItemField(idx, 'item_id', val); }} fetchOptions={fetchItemOptions} placeholder="Search items (2+ chars)" /></div>
                    <div className="col-span-2"><Input label="Qty" type="number" value={String(it.quantity)} onChange={(e) => updateItemField(idx, 'quantity', Number(e.target.value))} disabled={activeBooking?.payment_status === 'completed'} /></div>
                    <div className="col-span-3"><Input label="Unit Price" type="number" value={String(it.unit_price)} onChange={(e) => updateItemField(idx, 'unit_price', Number(e.target.value))} disabled={!!selectedPackageId || activeBooking?.payment_status === 'completed'} /></div>
                    <div className="col-span-2"><Input label="Discount" type="number" value={String(it.discount_amount || 0)} onChange={(e) => updateItemField(idx, 'discount_amount', Number(e.target.value))} disabled={!!selectedPackageId || activeBooking?.payment_status === 'completed'} /></div>
                    <div className="col-span-1 flex justify-end"><Button variant="ghost" size="sm" onClick={() => removeItemLine(idx)}>X</Button></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-700">
              <div>
                {selectedPackageId ? (
                  <>Package Total: {formatCurrency(bookingTotal)}</>
                ) : (
                  <>Total: {formatCurrency(bookingTotal)}</>
                )}
                {selectedPackageId ? null : (
                  <> | Discount: {formatCurrency(bookingDiscount)} | Final: {formatCurrency(bookingFinal)}</>
                )}
                <br />
                Down Payment: {formatCurrency(downPayment)} | Remaining: {formatCurrency(remainingAmount)}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setIsEditModalOpen(false); setActiveBooking(null); }}>Cancel</Button>
                <Button onClick={submitEditBooking} loading={creating}>Save</Button>
              </div>
            </div>
          </div>
        </SimpleModal>

        {/* View Booking Modal */}
        <SimpleModal
          isOpen={isViewModalOpen}
          title="Booking Details"
          onClose={() => { setIsViewModalOpen(false); setActiveBooking(null); }}
        >
          <div className="space-y-3 text-sm">
            <div><strong>ID:</strong> {activeBooking?.id}</div>
            <div><strong>Customer:</strong> {activeBooking?.customer?.first_name} {activeBooking?.customer?.last_name} ({activeBooking?.customer?.email})</div>
            <div><strong>Status:</strong> {activeBooking?.status} • <strong>Payment:</strong> {activeBooking?.payment_status}</div>
            <div><strong>Dates:</strong> {activeBooking?.booking_date && formatDate(activeBooking.booking_date)} {activeBooking?.appointment_date && `→ ${formatDate(activeBooking.appointment_date)}`}</div>
            {!activeBooking?.package_pricing_id && (
              <div><strong>Total:</strong> {formatCurrency((activeBooking?.total_amount || 0) - (activeBooking?.discount_amount || 0))}</div>
            )}
            
            {/* Package Pricing Information */}
            {activeBooking?.package_pricing_id && (
              <div>
                <div className="font-medium">Package</div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="font-semibold text-blue-900">
                    {activeBooking.package_pricing?.package_name || 'Package Pricing'}
                  </div>
                  <div className="text-sm text-blue-700">
                    Duration: {activeBooking.package_pricing?.duration_hours || 'N/A'} hours
                  </div>
                  <div className="text-sm text-blue-700">
                    Price: {formatCurrency(activeBooking.package_pricing?.price || activeBooking.total_amount || 0)}
                  </div>
                </div>
              </div>
            )}
            
            {/* Items Information */}
            {activeBooking?.items && activeBooking.items.length > 0 && (
              <div>
                <div className="font-medium">
                  {activeBooking?.package_pricing_id ? 'Included Items' : 'Items'}
                </div>
                <ul className="list-disc ml-5">
                  {activeBooking.items.map(it => (
                    <li key={it.id}>
                      {it.item?.name} ×{it.quantity}
                      {!activeBooking?.package_pricing_id && ` – ${formatCurrency(it.final_price)}`}
                    </li>
                  ))}
                </ul>
                {activeBooking?.package_pricing_id && (
                  <div className="mt-2 text-right font-semibold">
                    Package Total: {formatCurrency(activeBooking?.package_pricing?.price || activeBooking?.total_amount || 0)}
                  </div>
                )}
              </div>
            )}
            {activeBooking?.notes && (
              <div>
                <div className="font-medium">Notes</div>
                <div className="text-gray-700">{activeBooking.notes}</div>
              </div>
            )}
            
            {/* Payment Actions */}
            <div className="pt-4 border-t">
              <div className="flex gap-2">
                {/* Dynamic Invoice Buttons based on Payment Status */}
                {activeBooking?.payment_status === 'pending' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleGenerateInvoice(activeBooking!.id, 'dp')}
                    title="Generate Down Payment Invoice"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    DP Invoice
                  </Button>
                )}
                {(activeBooking?.payment_status === 'partial' || activeBooking?.payment_status === 'completed') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleGenerateInvoice(activeBooking!.id, 'full')}
                    title="Generate Full Payment Invoice"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Full Invoice
                  </Button>
                )}
                {activeBooking?.payment_status === 'partial' && activeBooking?.paid_amount && activeBooking.paid_amount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleGenerateInvoice(activeBooking!.id, 'dp')}
                    title="Generate Down Payment Invoice"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    DP Invoice
                  </Button>
                )}
                {activeBooking?.payment_status === 'partial' && activeBooking?.remaining_amount && activeBooking.remaining_amount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleMakeFullPayment(activeBooking.id)}
                    title="Make Full Payment"
                    className="text-green-600 hover:text-green-700"
                  >
                    <span className="mr-1">💰</span>
                    Full Payment
                  </Button>
                )}
                {/* Rental creation button removed to keep flow under Rentals menu */}
              </div>
            </div>
          </div>
        </SimpleModal>

        {/* Pagination Info */}
        {!loading && bookings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
            <div className="text-sm text-gray-500">
              Showing {bookings.length} of {total} bookings (Page {currentPage} of {totalPages})
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Booking Invoice Modal */}
        <BookingInvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setInvoiceData(null);
          }}
          invoice={invoiceData}
        />
      </div>
    </DashboardLayout>
  );
}