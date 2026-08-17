'use client';

import Link from 'next/link';

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SafeImage } from '@/components/ui/SafeImage';
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
import { Item, ItemFilters, CreateItemRequest, Category, ItemFacets } from '@/types';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { facetOptions } from '@/lib/select-options';
import { PageShell } from '@/components/ui/PageShell';
import { Badge, FilterBar, EmptyState, InfiniteScrollSentinel, Skeleton, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { Plus, Edit, Trash2, Package, Filter, Grid, List, QrCode, CalendarCheck, ArrowRightLeft } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { hasNextPage, LIST_PAGE_SIZE, useInfiniteList } from '@/hooks/useInfiniteList';
import { TransferItemModal } from '@/components/modals/TransferItemModal';
import SimpleModal from '@/components/modals/SimpleModal';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';

type ViewMode = 'grid' | 'list';

export default function ItemsPage() {
  const { user } = useAuth();
  const { viewingAll } = useBranch();
  const isAdmin = user?.role === 'admin';
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [filters, setFilters] = useState<ItemFilters>({});
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
  const [facets, setFacets] = useState<ItemFacets>({
    types: [],
    brands: [],
    colors: [],
    sizes: [],
    statuses: [],
    conditions: [],
  });
  const { success, error } = useToast();
  const [availabilityForItem, setAvailabilityForItem] = useState<Item | null>(null);
  const [availabilityDates, setAvailabilityDates] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [availabilityResult, setAvailabilityResult] = useState<string>('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [rentalDate, setRentalDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [transferringItem, setTransferringItem] = useState<Item | null>(null);

  // Load categories for filter dropdown
  useEffect(() => {
    loadCategories();
    loadFacets();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const type = new URLSearchParams(window.location.search).get('type');
    if (type) {
      setFilters((prev) => (prev.type === type ? prev : { ...prev, type }));
    }
  }, []);

  const loadFacets = async () => {
    try {
      const data = await apiClient.getItemFacets();
      setFacets(data);
    } catch (err) {
      console.error('Failed to load item facets:', err);
    }
  };

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

  const loadItemsPage = useCallback(async (page: number) => {
    try {
      const paginationFilters = {
        ...filters,
        page,
        limit: LIST_PAGE_SIZE,
      };
      const response =
        rentalDate && returnDate
          ? await apiClient.getAvailableItemsCombined({
              ...paginationFilters,
              start_date: rentalDate,
              end_date: returnDate,
            })
          : await apiClient.getItems(paginationFilters);

      if (!response?.success) {
        throw new Error('API request failed');
      }

      const nextItems = response.data?.data?.items || [];
      const pagination = response.data?.pagination;
      return {
        items: nextItems,
        hasMore: hasNextPage(pagination, nextItems.length),
        total: pagination?.total || 0,
      };
    } catch (err) {
      console.error('Failed to load items:', err);
      error('Failed to Load Items', 'Unable to fetch item data. Please try again.');
      return { items: [], hasMore: false, total: 0 };
    }
  }, [filters, rentalDate, returnDate, error]);

  const {
    items,
    loading,
    loadingMore,
    hasMore,
    total,
    reload,
    sentinelRef,
  } = useInfiniteList(loadItemsPage);

  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch || undefined }));
  }, [debouncedSearch]);

  const handleBarcodeScan = (barcode: string) => {
    const cleanedBarcode = sanitizeBarcode(barcode);
    setFilters({ ...filters, barcode: cleanedBarcode });
    setIsScannerOpen(false);
    setUseSimpleScanner(false);
    success('Barcode Scanned!', `Searching for barcode: ${cleanedBarcode}`);
  };

  const handleAddItem = async (itemData: CreateItemRequest) => {
    try {
      await apiClient.createItem(itemData);
      success('Item Created Successfully!', `${itemData.name} has been added to the inventory.`);
      // Reload items after successful creation
      await reload();
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
      await reload(); // Reload items after successful update
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
      await reload(); // Reload items after successful deletion
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

  const typeOptions = facetOptions(facets.types, 'All Types');
  const statusOptions = facetOptions(facets.statuses, 'All Status');
  const conditionOptions = facetOptions(facets.conditions, 'All Conditions');
  const brandOptions = facetOptions(facets.brands, 'All Brands', false);
  const colorOptions = facetOptions(facets.colors, 'All Colors', false);

  const itemFacts = (item: Item) =>
    [item.color, item.size?.label, `Qty ${item.quantity}`].filter(Boolean).join(' · ');

  const ItemActions = ({ item, overlay = false }: { item: Item; overlay?: boolean }) => (
    <OverflowMenu label="Item actions" overlay={overlay}>
      <OverflowMenuItem
        icon={<CalendarCheck className="h-4 w-4 text-slate-400" />}
        onClick={() => {
          setAvailabilityForItem(item);
          setAvailabilityDates({ start: '', end: '' });
          setAvailabilityResult('');
        }}
      >
        Check dates
      </OverflowMenuItem>
      {isAdmin && (
        <OverflowMenuItem
          icon={<ArrowRightLeft className="h-4 w-4 text-slate-400" />}
          onClick={() => setTransferringItem(item)}
        >
          Transfer
        </OverflowMenuItem>
      )}
      <OverflowMenuItem icon={<Edit className="h-4 w-4 text-slate-400" />} onClick={() => handleEditItem(item)}>
        Edit
      </OverflowMenuItem>
      <OverflowMenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDeleteItem(item)}>
        Delete
      </OverflowMenuItem>
    </OverflowMenu>
  );

  const ItemCard = ({ item }: { item: Item }) => (
    <Card padding="none" className="relative z-0 h-full overflow-hidden">
      <div className="relative flex aspect-square items-center justify-center bg-slate-100">
        <SafeImage
          src={item.thumbnail_url}
          alt={item.name}
          width={320}
          height={320}
          className="h-full w-full object-cover"
          fallback={<Package className="h-10 w-10 text-slate-300" />}
        />
        <Link
          href={`/dashboard/items/${item.id}`}
          className="absolute inset-0"
          aria-label={item.name}
        />
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1">
          {item.size?.label && (
            <span className="rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
              {item.size.label}
            </span>
          )}
        </div>
        {viewingAll && item.branch?.name && (
          <span className="pointer-events-none absolute bottom-2 left-2 max-w-[90%] truncate rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
            {item.branch.name}
          </span>
        )}
        <div className="absolute right-2 top-2 z-10">
          <ItemActions item={item} overlay />
        </div>
      </div>
      <div className="space-y-0.5 p-2.5">
        <Link
          href={`/dashboard/items/${item.id}`}
          className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 hover:text-indigo-700"
        >
          {item.name}
        </Link>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-slate-500">
            {item.color || item.brand || item.code}
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900" title={formatCurrency(item.one_day_price)}>
            {formatCurrencyCompact(item.one_day_price)}
            <span className="text-[11px] font-medium text-slate-400">/day</span>
          </span>
        </div>
        <Badge variant={itemStatusVariant(item.status)} dot className="capitalize">
          {item.status}
        </Badge>
      </div>
    </Card>
  );

  const ItemListItem = ({ item }: { item: Item }) => (
    <Card padding="sm">
      <CardContent>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={`/dashboard/items/${item.id}`}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-20"
          >
            <SafeImage
              src={item.thumbnail_url}
              alt={item.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              fallback={<Package className="h-7 w-7 text-slate-300" />}
            />
          </Link>

          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/items/${item.id}`}
              className="line-clamp-1 font-semibold text-slate-900 hover:text-indigo-700"
            >
              {item.name}
            </Link>
            <p className="mt-0.5 truncate text-sm text-slate-500">
              {itemFacts(item)}
              {viewingAll && item.branch?.name ? ` · ${item.branch.name}` : ''}
            </p>
            {item.code && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{item.code}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCurrency(item.one_day_price)}
                <span className="text-[11px] font-medium text-slate-400">/day</span>
              </p>
              <Badge variant={itemStatusVariant(item.status)} dot className="mt-1 capitalize">
                {item.status}
              </Badge>
            </div>
            <ItemActions item={item} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary>
      <>
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
                className={filters.barcode ? 'border-indigo-500 bg-indigo-50' : undefined}
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
            
            <div className="flex shrink-0 gap-2">
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
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                size="md"
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List className="h-4 w-4" />
              </Button>
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
                      searchable={false}
                      label="Type"
                      options={typeOptions}
                      value={filters.type || ''}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
                    />
                    <Select
                      searchable={false}
                      label="Status"
                      options={statusOptions}
                      value={filters.status || ''}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                    />
                    <Select
                      searchable={false}
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
                              onChange={(e) => { setRentalDate(e.target.value); }}
                            />
                          </div>
                          {/* Return Date */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Return Date</label>
                            <Input
                              type="date"
                              value={returnDate}
                              min={rentalDate || undefined}
                              onChange={(e) => { setReturnDate(e.target.value); }}
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
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4"
            : "space-y-3"
          }>
            {Array.from({ length: 8 }).map((_, i) => (
              viewMode === 'grid' ? (
                <div key={i} className="overflow-hidden rounded-2xl glass-panel">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="space-y-2 p-2.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-center gap-4 rounded-2xl glass-panel p-4">
                  <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              )
            ))}
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
            ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" 
            : "space-y-3"
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

        {items.length > 0 && (
          <InfiniteScrollSentinel
            sentinelRef={sentinelRef}
            loadingMore={loadingMore}
            hasMore={hasMore}
            loaded={items.length}
            total={total}
          />
        )}
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

      <TransferItemModal
        isOpen={!!transferringItem}
        item={transferringItem}
        onClose={() => setTransferringItem(null)}
        onTransferred={(updated) => {
          setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        }}
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

      <SimpleModal
        isOpen={Boolean(availabilityForItem)}
        title="Check availability"
        onClose={() => { setAvailabilityForItem(null); setAvailabilityResult(''); }}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setAvailabilityForItem(null); setAvailabilityResult(''); }}>Close</Button>
            <Button
              onClick={async () => {
                if (!availabilityDates.start || !availabilityDates.end) {
                  setAvailabilityResult('Please select both dates');
                  return;
                }
                setCheckingAvailability(true);
                try {
                  if (availabilityForItem && availabilityForItem.status !== 'available') {
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
          </>
        }
      >
        {availabilityForItem && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 truncate">{availabilityForItem.name} · {availabilityForItem.code}</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Rental date" type="date" value={availabilityDates.start} onChange={(e) => setAvailabilityDates((prev) => ({ ...prev, start: e.target.value }))} />
              <Input label="Return date" type="date" value={availabilityDates.end} onChange={(e) => setAvailabilityDates((prev) => ({ ...prev, end: e.target.value }))} />
            </div>
            {availabilityResult && (
              <p className={`text-sm ${availabilityResult.startsWith('Available') ? 'text-emerald-700' : 'text-red-600'}`}>{availabilityResult}</p>
            )}
          </div>
        )}
      </SimpleModal>
      </>
    </ErrorBoundary>
  );
}