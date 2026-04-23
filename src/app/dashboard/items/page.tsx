'use client';

import Image from 'next/image';
import Link from 'next/link';

import React, { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import ClientOnly from '@/components/ClientOnly';
import ErrorBoundary from '@/components/ErrorBoundary';
import AddItemModal from '@/components/modals/AddItemModal';
import EditItemModal from '@/components/modals/EditItemModal';
import DeleteConfirmModal from '@/components/modals/DeleteConfirmModal';
import dynamic from 'next/dynamic';
const BarcodeScanner = dynamic(() => import('@/components/ui/BarcodeScanner'), { 
  ssr: false,
  loading: () => <div>Loading scanner...</div>
});
const SimpleBarcodeScanner = dynamic(() => import('@/components/ui/SimpleBarcodeScanner'), { 
  ssr: false,
  loading: () => <div>Loading test scanner...</div>
});
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { Item, ItemFilters, CreateItemRequest, Category } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, Pagination, SkeletonCard } from '@/components/ui/DataDisplay';
import { Plus, Edit, Trash2, Package, Filter, Grid, List, QrCode, CalendarCheck } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

type ViewMode = 'grid' | 'list';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ItemFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(12); // Show 12 items per page
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [useSimpleScanner, setUseSimpleScanner] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const { success, error } = useToast();
  const [availabilityForItem, setAvailabilityForItem] = useState<Item | null>(null);
  const [availabilityDates, setAvailabilityDates] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [availabilityResult, setAvailabilityResult] = useState<string>('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [rentalDate, setRentalDate] = useState('');
  const [returnDate, setReturnDate] = useState('');

  // Load categories for filter dropdown
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await apiClient.getCategoryTree();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Helper function to flatten category tree for dropdown selection
  const flattenCategories = (categories: Category[], level: number = 0): Category[] => {
    const result: Category[] = [];
    categories.forEach(category => {
      const prefix = level === 0 ? '📁' : '  └─';
      result.push({
        ...category,
        name: prefix + ' '.repeat(level * 2) + category.name
      });
      if (category.subcategories && category.subcategories.length > 0) {
        result.push(...flattenCategories(category.subcategories, level + 1));
      }
    });
    return result;
  };

  // Keep barcode input clean and consistent for backend exact-match filtering
  const sanitizeBarcode = (raw: string): string => {
    // Remove quotes and non-digits; backend expects exact string match
    const digitsOnly = raw.replace(/^\s*\"|\"\s*$/g, '').replace(/[^0-9]/g, '');
    return digitsOnly;
  };

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const paginationFilters = {
        ...filters,
        page: currentPage,
        limit: itemsPerPage
      };
      let response;
      if (rentalDate && returnDate) {
        response = await apiClient.getAvailableItemsCombined({
          ...paginationFilters,
          start_date: rentalDate,
          end_date: returnDate,
        });
      } else {
        response = await apiClient.getItems(paginationFilters);
      }
      
      if (!response?.success) {
        throw new Error('API request failed');
      }

      const nextItems = response.data?.data?.items || [];
      setItems(nextItems);
      setTotal(response.data?.pagination?.total || 0);
      setTotalPages(response.data?.pagination?.total_pages || 1);
    } catch (err) {
      console.error('Failed to load items:', err);
      error('Failed to Load Items', 'Unable to fetch item data. Please try again.');
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, rentalDate, returnDate, error]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }));
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleBarcodeScan = (barcode: string) => {
    const cleanedBarcode = sanitizeBarcode(barcode);
    setFilters({ ...filters, barcode: cleanedBarcode });
    setCurrentPage(1);
    setIsScannerOpen(false);
    setUseSimpleScanner(false);
    success('Barcode Scanned!', `Searching for barcode: ${cleanedBarcode}`);
  };

  const handleAddItem = async (itemData: CreateItemRequest) => {
    try {
      await apiClient.createItem(itemData);
      success('Item Created Successfully!', `${itemData.name} has been added to the inventory.`);
      // Reload items after successful creation
      await loadItems();
    } catch (error) {
      console.error('Failed to create item:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
  };

  const handleUpdateItem = async (id: string, itemData: Partial<CreateItemRequest>) => {
    try {
      await apiClient.updateItem(id, itemData);
      const item = items.find(i => i.id === id);
      const itemName = item ? item.name : 'Item';
      success('Item Updated Successfully!', `${itemName} has been updated.`);
      await loadItems(); // Reload items after successful update
    } catch (error) {
      console.error('ItemsPage: Failed to update item:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const handleDeleteItem = (item: Item) => {
    setDeletingItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    
    setDeleteLoading(true);
    try {
      await apiClient.deleteItem(deletingItem.id);
      success('Item Deleted Successfully!', `${deletingItem.name} has been removed from the inventory.`);
      await loadItems(); // Reload items after successful deletion
      setDeletingItem(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
      error('Failed to Delete Item', 'Please try again or contact support if the problem persists.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const itemStatusVariant = (s: string): 'success' | 'primary' | 'warning' | 'danger' | 'default' => {
    switch (s) {
      case 'available':   return 'success';
      case 'rented':      return 'primary';
      case 'maintenance': return 'warning';
      case 'retired':     return 'danger';
      default:            return 'default';
    }
  };

  const itemConditionVariant = (s: string): 'success' | 'primary' | 'warning' | 'danger' | 'default' => {
    switch (s) {
      case 'excellent': return 'success';
      case 'good':      return 'primary';
      case 'fair':      return 'warning';
      case 'poor':      return 'danger';
      default:          return 'default';
    }
  };

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'suit', label: 'Suit' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'tie', label: 'Tie' },
    { value: 'belt', label: 'Belt' },
    { value: 'trousers', label: 'Trousers' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'vest', label: 'Vest' },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'available', label: 'Available' },
    { value: 'rented', label: 'Rented' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'retired', label: 'Retired' },
  ];

  const conditionOptions = [
    { value: '', label: 'All Conditions' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  const brandOptions = [
    { value: '', label: 'All Brands' },
    { value: 'SuitLabs Standard', label: 'SuitLabs Standard' },
    { value: 'Goldy', label: 'Goldy' },
    { value: 'Mubeng', label: 'Mubeng' },
    { value: 'Parayu', label: 'Parayu' },
  ];

  const colorOptions = [
    { value: '', label: 'All Colors' },
    { value: 'Black', label: 'Black' },
    { value: 'Navy', label: 'Navy' },
    { value: 'Gray', label: 'Gray' },
    { value: 'Brown', label: 'Brown' },
    { value: 'White', label: 'White' },
    { value: 'Blue', label: 'Blue' },
  ];


  const ItemCard = ({ item }: { item: Item }) => (
    <Card key={item.id}>
      <CardContent className="space-y-3">
        {/* Item Image */}
        <Link href={`/dashboard/items/${item.id}`} className="block">
          <div className="aspect-square rounded-2xl flex items-center justify-center overflow-hidden bg-black/5 ring-1 ring-black/5">
            {item.thumbnail_url && (/^https?:\/\//.test(item.thumbnail_url) || item.thumbnail_url.startsWith('/')) ? (
              <Image
                src={item.thumbnail_url}
                alt={item.name}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-12 w-12 text-slate-400" />
            )}
          </div>
        </Link>

        {/* Item Details */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/dashboard/items/${item.id}`} className="font-semibold text-slate-900 hover:underline flex-1 min-w-0">
              <span className="leading-snug [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                {item.name}
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5 max-w-full overflow-hidden">
            <Badge variant={itemStatusVariant(item.status)}>{item.status}</Badge>
            <Badge variant={itemConditionVariant(item.condition)}>{item.condition}</Badge>
            {/* Category is usually redundant in dense cards — keep only if short */}
            {item.category?.name && item.category.name.length <= 18 && (
              <span className="inline-flex items-center rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-black/5 truncate max-w-[10rem]">
                {item.category.name}
              </span>
            )}
          </div>

          <div className="text-sm text-slate-600">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-slate-700 truncate max-w-[11rem]">{item.brand}</span>
              <span className="text-slate-300">•</span>
              <span className="truncate max-w-[7rem]">{item.color}</span>
              <span className="text-slate-300">•</span>
              <span className="tabular-nums">Size {item.size.label}</span>
              <span className="text-slate-300">•</span>
              <span className="tabular-nums">Qty {item.quantity}</span>
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-black/5 truncate max-w-[10rem]">
                {item.tags[0]}
              </span>
              {item.tags.length > 1 && (
                <span className="inline-flex items-center rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-medium text-slate-500 ring-1 ring-black/5">
                  +{item.tags.length - 1}
                </span>
              )}
            </div>
          )}

          <div className="pt-1">
            <p className="text-base font-semibold text-slate-900 tabular-nums">
              {formatCurrency(item.one_day_price)}
              <span className="text-xs font-medium text-slate-500">/day</span>
            </p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 tabular-nums">
            {item.code ? `ID • ${item.code}` : ''}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAvailabilityForItem(item); setAvailabilityDates({ start: '', end: '' }); setAvailabilityResult(''); }}
            title="Check Availability"
            aria-label="Check Availability"
            className="h-9 w-9 p-0 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-white/60"
          >
            <CalendarCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditItem(item)}
            title="Edit"
            aria-label="Edit"
            className="h-9 w-9 p-0 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-white/60"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteItem(item)}
            title="Delete"
            aria-label="Delete"
            className="h-9 w-9 p-0 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-red-500/10 text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  const ItemListItem = ({ item }: { item: Item }) => (
    <Card key={item.id}>
      <CardContent>
        <div className="flex space-x-4">
          {/* Item Image */}
          <Link href={`/dashboard/items/${item.id}`} className="w-16 h-16 sm:w-20 sm:h-20 bg-black/5 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 ring-1 ring-black/5">
            {item.thumbnail_url && (/^https?:\/\//.test(item.thumbnail_url) || item.thumbnail_url.startsWith('/')) ? (
              <Image
                src={item.thumbnail_url}
                alt={item.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" />
            )}
          </Link>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <Link href={`/dashboard/items/${item.id}`} className="font-semibold text-slate-900 hover:underline flex-1 min-w-0">
                <span className="leading-snug [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden">
                  {item.name}
                </span>
              </Link>
              {item.code && <span className="text-xs text-slate-500 ml-2 shrink-0 tabular-nums">#{item.code}</span>}
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              <Badge variant={itemStatusVariant(item.status)}>{item.status}</Badge>
              <Badge variant={itemConditionVariant(item.condition)}>{item.condition}</Badge>
            </div>

            <div className="flex justify-between items-end">
              <div className="text-sm text-slate-600">
                <p>{item.brand} • {item.color} • Size {item.size.label} • Qty {item.quantity}</p>
                {item.category && (
                  <p className="text-xs text-slate-600 font-medium mb-1">{item.category.name}</p>
                )}
                <p className="font-semibold text-slate-900 tabular-nums">{formatCurrency(item.one_day_price)}<span className="text-xs font-medium text-slate-500">/day</span></p>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setAvailabilityForItem(item); setAvailabilityDates({ start: '', end: '' }); setAvailabilityResult(''); }}
                  title="Check Availability"
                  aria-label="Check Availability"
                  className="h-9 w-9 p-0 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-white/60"
                >
                  <CalendarCheck className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEditItem(item)}
                  title="Edit"
                  aria-label="Edit"
                  className="h-9 w-9 p-0 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-white/60"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteItem(item)}
                  title="Delete"
                  aria-label="Delete"
                  className="h-9 w-9 p-0 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-red-500/10 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary>
      <DashboardLayout>
        <PageShell
          title="Items"
          subtitle="Manage your inventory of suits and accessories"
          action={
            <Button size="md" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          }
        >
        {/* Search and View Controls */}
        <FilterBar>
            <div className="flex-1 relative">
              <Input
                placeholder={filters.barcode ? `Barcode: ${filters.barcode}` : "Search items..."}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={filters.barcode ? 'border-blue-500 bg-blue-50' : undefined}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => {
                    setUseSimpleScanner(false);
                    setIsScannerOpen(true);
                  }}
                  className="text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Scan Barcode"
                  suppressHydrationWarning
                >
                  <QrCode className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="sm:hidden">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setShowFilters((v) => !v)}
                  title="Toggle filters"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              <div className="hidden sm:flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="md"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </FilterBar>

        {/* Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
          <Card>
            <CardContent>
              <ClientOnly>
                <div className="space-y-4">
                  {/* Filter Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <Select
                      label="Type"
                      options={typeOptions}
                      value={filters.type || ''}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                    />
                    <Select
                      label="Status"
                      options={statusOptions}
                      value={filters.status || ''}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                    />
                    <Select
                      label="Condition"
                      options={conditionOptions}
                      value={filters.condition || ''}
                      onChange={(e) => setFilters({ ...filters, condition: e.target.value || undefined })}
                    />
                    <Select
                      label="Brand"
                      options={brandOptions}
                      value={filters.brand || ''}
                      onChange={(e) => setFilters({ ...filters, brand: e.target.value || undefined })}
                    />
                    <Select
                      label="Color"
                      options={colorOptions}
                      value={filters.color || ''}
                      onChange={(e) => setFilters({ ...filters, color: e.target.value || undefined })}
                    />
                    <Select
                      label="Category"
                      options={[
                        { value: '', label: 'All Categories' },
                        ...flattenCategories(categories).map(category => ({
                          value: category.id,
                          label: category.name
                        }))
                      ]}
                      value={filters.category_id || ''}
                      onChange={(e) => setFilters({ ...filters, category_id: e.target.value || undefined })}
                      disabled={loadingCategories}
                    />
                  </div>
                  
                  {/* Advanced: Barcode + Availability date range */}
                  <div className="pt-2">
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex-1 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Barcode Field */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Barcode</label>
                            <div className="flex items-stretch gap-2">
                              <Input
                                placeholder="Enter barcode or scan..."
                                value={filters.barcode || ''}
                                onChange={(e) => {
                                  const cleaned = sanitizeBarcode(e.target.value);
                                  setFilters({ ...filters, barcode: cleaned || undefined });
                                  setCurrentPage(1);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setCurrentPage(1);
                                  }
                                }}
                              />
                              <Button
                                onClick={() => {
                                  setUseSimpleScanner(false);
                                  setIsScannerOpen(true);
                                }}
                                className="h-[44px] px-3 rounded-xl"
                                title="Scan Barcode"
                                aria-label="Scan Barcode"
                                suppressHydrationWarning
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Rental Date */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Rental Date</label>
                            <Input
                              type="date"
                              value={rentalDate}
                              onChange={(e) => { setRentalDate(e.target.value); setCurrentPage(1); }}
                            />
                          </div>
                          {/* Return Date */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Return Date</label>
                            <Input
                              type="date"
                              value={returnDate}
                              min={rentalDate || undefined}
                              onChange={(e) => { setReturnDate(e.target.value); setCurrentPage(1); }}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-end">
                        <Button
                          variant="ghost"
                          size="md"
                          onClick={() => { setFilters({}); setSearchInput(''); setRentalDate(''); setReturnDate(''); }}
                          className="px-4 py-2 rounded-xl ring-1 ring-black/5 bg-white/40 hover:bg-white/60 text-slate-900"
                        >
                          Clear All
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </ClientOnly>
            </CardContent>
          </Card>
        </div>

        {/* Items Grid/List */}
        {loading ? (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            : "space-y-4"
          }>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package className="h-10 w-10" />}
            title="No items found"
            description={filters.search || filters.type || filters.status ? 'Try adjusting your filters' : 'Get started by adding your first item'}
            action={<Button onClick={() => setShowAddModal(true)}><Plus className="h-4 w-4" /> Add Item</Button>}
          />
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" 
            : "space-y-4"
          }>
            {items.map((item) => 
              viewMode === 'grid' ? (
                <ItemCard key={item.id} item={item} />
              ) : (
                <ItemListItem key={item.id} item={item} />
              )
            )}
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={total}
          perPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </PageShell>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
      />

      {/* Edit Item Modal */}
      <EditItemModal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        onUpdate={handleUpdateItem}
        item={editingItem}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
        item={deletingItem}
        loading={deleteLoading}
      />

      {/* Barcode Scanner Modal */}
      {useSimpleScanner ? (
        <SimpleBarcodeScanner
          isOpen={isScannerOpen}
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      ) : (
        <BarcodeScanner
          isOpen={isScannerOpen}
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Availability Modal */}
      {availabilityForItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Check Availability</h3>
            <p className="text-sm text-gray-600 mb-4 truncate">Item: {availabilityForItem.name} #{availabilityForItem.code}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rental Date</label>
                <Input type="date" value={availabilityDates.start} onChange={(e) => setAvailabilityDates(prev => ({ ...prev, start: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Return Date</label>
                <Input type="date" value={availabilityDates.end} onChange={(e) => setAvailabilityDates(prev => ({ ...prev, end: e.target.value }))} />
              </div>
            </div>
            {availabilityResult && (
              <div className={`mb-3 text-sm ${availabilityResult.startsWith('Available') ? 'text-green-700' : 'text-red-700'}`}>{availabilityResult}</div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAvailabilityForItem(null); setAvailabilityResult(''); }}>Close</Button>
              <Button
                onClick={async () => {
                  if (!availabilityDates.start || !availabilityDates.end) {
                    setAvailabilityResult('Please select both dates');
                    return;
                  }
                  setCheckingAvailability(true);
                  try {
                    // Basic client-side rule: item must be currently status=available
                    // For full accuracy, add a backend date-conflict endpoint later
                    if (availabilityForItem.status !== 'available') {
                      setAvailabilityResult('Unavailable: item is not currently available');
                    } else {
                      setAvailabilityResult('Available for the selected dates');
                    }
                  } finally {
                    setCheckingAvailability(false);
                  }
                }}
                loading={checkingAvailability}
              >
                Check
              </Button>
            </div>
          </div>
        </div>
      )}
      </DashboardLayout>
    </ErrorBoundary>
  );
}