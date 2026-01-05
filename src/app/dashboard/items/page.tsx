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
import { Plus, Edit, Trash2, Package, Filter, Grid, List, QrCode, CalendarCheck } from 'lucide-react';

type ViewMode = 'grid' | 'list';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ItemFilters>({});
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
      
      // Handle case where response might be undefined or have unexpected structure
      if (response && response.data && response.data.data && response.data.data.items && Array.isArray(response.data.data.items)) {
        setItems(response.data.data.items);
        setTotal(response.data.pagination?.total || 0);
        setTotalPages(response.data.pagination?.total_pages || 1);
      } else {
        console.warn('Unexpected API response structure:', response);
        setItems([]);
        setTotal(0);
        setTotalPages(1);
      }
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

  const handleSearch = (search: string) => {
    setFilters({ ...filters, search });
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleBarcodeScan = (barcode: string) => {
    const cleanedBarcode = sanitizeBarcode(barcode);
    setFilters({ ...filters, barcode: cleanedBarcode });
    setCurrentPage(1);
    setIsScannerOpen(false);
    setUseSimpleScanner(false);
    success('Barcode Scanned!', `Searching for barcode: ${cleanedBarcode}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
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
      console.log('ItemsPage: Updating item', id, 'with data:', itemData);
      const result = await apiClient.updateItem(id, itemData);
      console.log('ItemsPage: Update result:', result);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'rented':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
            {item.thumbnail_url && /^https?:\/\//.test(item.thumbnail_url) ? (
              <Image
                src={item.thumbnail_url}
                alt={item.name}
                width={200}
                height={200}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-12 w-12 text-gray-400" />
            )}
          </div>
        </Link>

        {/* Item Details */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <Link href={`/dashboard/items/${item.id}`} className="font-medium text-gray-900 truncate flex-1 hover:underline">
              {item.name}
            </Link>
            <span className="text-xs text-gray-500 ml-2">#{item.code}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
              {item.status}
            </span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
              {item.condition}
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>{item.brand} • {item.color}</p>
            <p>Size: {item.size.label}</p>
            <p>Qty: {item.quantity}</p>
            {item.category && (
              <p className="text-xs text-blue-600 font-medium">
                📁 {item.category.name}
              </p>
            )}
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
              {item.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  +{item.tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="text-sm font-medium text-gray-900">
            <p>{formatCurrency(item.one_day_price)}/day</p>
            <p className="text-xs text-gray-500">{formatCurrency(item.four_hour_price)}/4hr</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setAvailabilityForItem(item); setAvailabilityDates({ start: '', end: '' }); setAvailabilityResult(''); }}
            title="Check Availability"
            aria-label="Check Availability"
            className="h-9 w-9 p-0 rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <CalendarCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditItem(item)}
            title="Edit"
            aria-label="Edit"
            className="h-9 w-9 p-0 rounded-md border border-gray-200 hover:bg-gray-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteItem(item)}
            title="Delete"
            aria-label="Delete"
            className="h-9 w-9 p-0 rounded-md border border-gray-200 hover:bg-red-50 text-red-600"
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
          <Link href={`/dashboard/items/${item.id}`} className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
            {item.thumbnail_url && /^https?:\/\//.test(item.thumbnail_url) ? (
              <Image
                src={item.thumbnail_url}
                alt={item.name}
                width={80}
                height={80}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
            )}
          </Link>

          {/* Item Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <Link href={`/dashboard/items/${item.id}`} className="font-medium text-gray-900 truncate hover:underline">
                {item.name}
              </Link>
              <span className="text-xs text-gray-500 ml-2">#{item.code}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
                {item.condition}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div className="text-sm text-gray-600">
                <p>{item.brand} • {item.color} • Size {item.size.label}</p>
                {item.category && (
                  <p className="text-xs text-blue-600 font-medium mb-1">
                    📁 {item.category.name}
                  </p>
                )}
                <p className="font-medium text-gray-900">{formatCurrency(item.one_day_price)}/day</p>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setAvailabilityForItem(item); setAvailabilityDates({ start: '', end: '' }); setAvailabilityResult(''); }}
                  title="Check Availability"
                  aria-label="Check Availability"
                  className="h-9 w-9 p-0 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  <CalendarCheck className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleEditItem(item)}
                  title="Edit"
                  aria-label="Edit"
                  className="h-9 w-9 p-0 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteItem(item)}
                  title="Delete"
                  aria-label="Delete"
                  className="h-9 w-9 p-0 rounded-md border border-gray-200 hover:bg-red-50 text-red-600"
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
        <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Items</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your inventory of suits and accessories
            </p>
          </div>
          <Button size="lg" fullWidth className="sm:w-auto" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Search and View Controls */}
        <ClientOnly>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Input
                placeholder={filters.barcode ? `Barcode: ${filters.barcode}` : "Search items..."}
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className={filters.barcode ? 'border-blue-500 bg-blue-50' : undefined}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  onClick={() => {
                    setUseSimpleScanner(false);
                    setIsScannerOpen(true);
                  }}
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Scan Barcode"
                >
                  <QrCode className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              
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
          </div>
        </ClientOnly>

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
                  
                  {/* Name and Barcode Section with Clear All Button */}
                  <div className="pt-2">
                    <div className="flex items-end justify-between gap-4">
                      <div className="flex-1 max-w-2xl">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Name Field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                            <Input
                              placeholder="Search by item name..."
                              value={filters.search || ''}
                              onChange={(e) => {
                                setFilters({ ...filters, search: e.target.value || undefined });
                                setCurrentPage(1);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setCurrentPage(1);
                                }
                              }}
                            />
                          </div>
                          
                          {/* Barcode Field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Barcode</label>
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
                                className="h-[44px] px-3 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                                title="Scan Barcode"
                                aria-label="Scan Barcode"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {/* Rental Date */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rental Date</label>
                            <Input
                              type="date"
                              value={rentalDate}
                              onChange={(e) => { setRentalDate(e.target.value); setCurrentPage(1); }}
                            />
                          </div>
                          {/* Return Date */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Return Date</label>
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
                          onClick={() => { setFilters({}); setRentalDate(''); setReturnDate(''); }}
                          className="px-4 py-2 rounded-md border border-gray-300 shadow-sm hover:bg-gray-50 text-gray-900"
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
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
            : "space-y-4"
          }>
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="animate-pulse">
                    <div className={viewMode === 'grid' ? "aspect-square bg-gray-200 rounded-lg mb-4" : "flex space-x-4"}>
                      {viewMode === 'list' && <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>}
                      {viewMode === 'grid' && <div className="w-full h-full bg-gray-200 rounded-lg"></div>}
                      {viewMode === 'list' && (
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        </div>
                      )}
                    </div>
                    {viewMode === 'grid' && (
                      <>
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-500 mb-4">
                {filters.search || filters.type || filters.status
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first item'}
              </p>
              <Button size="lg" onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
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

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} items
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="flex items-center"
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="flex items-center"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Pagination Info for single page */}
        {!loading && totalPages === 1 && items.length > 0 && (
          <div className="text-center text-sm text-gray-500 py-4">
            Showing {items.length} of {total} items
          </div>
        )}
      </div>

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