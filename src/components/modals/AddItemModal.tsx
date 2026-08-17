'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { FilePick, Input, NumberInput } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { CreateItemRequest, Category, ItemFacets } from '@/types';
import { apiClient } from '@/lib/api';
import SimpleModal from '@/components/modals/SimpleModal';
import { useAuth } from '@/contexts/AuthContext';
import { facetOptions } from '@/lib/select-options';
import { Switch } from '@/components/ui/Switch';

const PURCHASE_PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'debit', label: 'Debit' },
  { value: 'cc', label: 'Credit card' },
];

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CreateItemRequest) => Promise<void>;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: '',
    trousers_code: '',
    brand: '',
    color: '',
    size_label: '',
    condition: 'excellent',
    quantity: '',
    standard_price: '',
    one_day_price: '',
    four_hour_price: '',
    purchase_price: '',
    selling_price: '',
    is_sellable: false,
    category_id: '',
    tags: '',
    payment_method: 'cash',
    on_credit: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadFacets();
    }
  }, [isOpen]);

  const loadFacets = async () => {
    try {
      setFacets(await apiClient.getItemFacets());
    } catch (error) {
      console.error('Failed to load item facets:', error);
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
        name: prefix + ' '.repeat(level * 2) + category.name // Add visual hierarchy indicators
      });
      if (category.subcategories && category.subcategories.length > 0) {
        result.push(...flattenCategories(category.subcategories, level + 1));
      }
    });
    return result;
  };

  const handleImageSelect = async (file?: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      // For new items, we'll upload the image after creating the item
      // For now, just create a preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } catch (e) {
      console.error('Failed to process image', e);
      setErrors(prev => ({ ...prev, image: 'Failed to process image' }));
    } finally {
      setUploading(false);
    }
  };

  const typeOptions = [
    { value: '', label: 'Select Type' },
    ...facetOptions(facets.types),
  ];

  const conditionOptions = facetOptions(facets.conditions);
  const brandOptions = [
    { value: '', label: 'Select brand' },
    ...facetOptions(facets.brands, undefined, false),
    ...(formData.brand && !facets.brands.includes(formData.brand)
      ? [{ value: formData.brand, label: formData.brand }]
      : []),
  ];
  const colorOptions = [
    { value: '', label: 'Select color' },
    ...facetOptions(facets.colors, undefined, false),
    ...(formData.color && !facets.colors.includes(formData.color)
      ? [{ value: formData.color, label: formData.color }]
      : []),
  ];
  const sizeOptions = [
    { value: '', label: 'Select size' },
    ...facetOptions(facets.sizes, undefined, false),
    ...(formData.size_label && !facets.sizes.includes(formData.size_label)
      ? [{ value: formData.size_label, label: formData.size_label }]
      : []),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate required fields
      const newErrors: Record<string, string> = {};
      if (!formData.code.trim()) newErrors.code = 'Code is required';
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.type) newErrors.type = 'Type is required';
      if (!formData.quantity || parseInt(formData.quantity) < 1) newErrors.quantity = 'Valid quantity is required (minimum 1)';
      if (!formData.standard_price || parseFloat(formData.standard_price) < 0) newErrors.standard_price = 'Valid standard price is required';
      if (!formData.one_day_price || parseFloat(formData.one_day_price) < 0) newErrors.one_day_price = 'Valid one day price is required';
      if (!formData.four_hour_price || parseFloat(formData.four_hour_price) < 0) newErrors.four_hour_price = 'Valid four hour price is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      // Create the item first
      const itemData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type as CreateItemRequest['type'],
        trousers_code: formData.trousers_code.trim() || undefined,
        brand: formData.brand.trim() || undefined,
        color: formData.color.trim() || undefined,
        size: formData.size_label.trim() ? { label: formData.size_label.trim() } : { label: '' },
        condition: formData.condition as 'excellent' | 'good' | 'fair' | 'poor',
        quantity: parseInt(formData.quantity),
        standard_price: parseFloat(formData.standard_price),
        one_day_price: parseFloat(formData.one_day_price),
        four_hour_price: parseFloat(formData.four_hour_price),
        ...(isAdmin && formData.purchase_price
          ? {
              purchase_price: parseFloat(formData.purchase_price),
              payment_method: formData.payment_method as CreateItemRequest['payment_method'],
              on_credit: formData.on_credit,
            }
          : {}),
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : undefined,
        is_sellable: formData.is_sellable,
        category_id: formData.category_id || '',
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };


      await onAdd(itemData);

      // Reset form
      setFormData({
        code: '',
        name: '',
        description: '',
        type: '',
        trousers_code: '',
        brand: '',
        color: '',
        size_label: '',
        condition: 'excellent',
        quantity: '',
        standard_price: '',
        one_day_price: '',
        four_hour_price: '',
        purchase_price: '',
        selling_price: '',
        is_sellable: false,
        category_id: '',
        tags: '',
        payment_method: 'cash',
        on_credit: false,
      });
      setPreviewUrl(null);
      onClose();
    } catch (error) {
      console.error('Failed to add item:', error);
      setErrors({ submit: 'Failed to add item. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'type' && value === 'retail' ? { is_sellable: true } : {}),
      ...(field === 'selling_price' && Number(value) > 0 && !prev.is_sellable ? { is_sellable: true } : {}),
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <SimpleModal
      isOpen={isOpen}
      title="Add item"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="add-item-form" loading={loading}>Add item</Button>
        </>
      }
    >
        <form id="add-item-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Input
              label="Code *"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              error={errors.code}
              placeholder="e.g., SUIT-001"
            />

            <Input
              label="Name *"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              placeholder="Enter item name"
            />

            <Select
              searchable={false}
              label="Type *"
              options={typeOptions}
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              error={errors.type}
            />

            {(formData.type === 'suit' || formData.type === 'jacket') && (
              <Input
                label="Default trousers code"
                value={formData.trousers_code}
                onChange={(e) => handleInputChange('trousers_code', e.target.value)}
                placeholder="Creates a separate trousers item for pairing"
              />
            )}

            <Select
              searchable={false}
              label="Condition"
              options={conditionOptions}
              value={formData.condition}
              onChange={(e) => handleInputChange('condition', e.target.value)}
            />

            <NumberInput
              label="Quantity *"
              min={0}
              value={formData.quantity}
              onChange={(n) => handleInputChange('quantity', n ? String(n) : '')}
              error={errors.quantity}
              placeholder="0"
            />

            <CurrencyInput
              label="Standard Price (3-day) *"
              value={formData.standard_price}
              onChange={(n) => handleInputChange('standard_price', n ? String(n) : '')}
              error={errors.standard_price}
            />

            <CurrencyInput
              label="One Day Price *"
              value={formData.one_day_price}
              onChange={(n) => handleInputChange('one_day_price', n ? String(n) : '')}
              error={errors.one_day_price}
            />

            <CurrencyInput
              label="Four Hour Price *"
              value={formData.four_hour_price}
              onChange={(n) => handleInputChange('four_hour_price', n ? String(n) : '')}
              error={errors.four_hour_price}
            />

            {isAdmin && (
              <CurrencyInput
                label="Buying Price"
                value={formData.purchase_price}
                onChange={(n) => handleInputChange('purchase_price', n ? String(n) : '')}
              />
            )}

            {isAdmin && parseFloat(formData.purchase_price) > 0 && (
              <>
                <Select
                  searchable={false}
                  label="Paid with"
                  options={PURCHASE_PAYMENT_OPTIONS}
                  value={formData.payment_method}
                  onChange={(e) => handleInputChange('payment_method', e.target.value)}
                  disabled={formData.on_credit}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={formData.on_credit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, on_credit: e.target.checked }))}
                  />
                  On credit (Payable)
                </label>
              </>
            )}

            <div className="lg:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_16rem] sm:items-end">
              <CurrencyInput
                label="Selling Price"
                value={formData.selling_price}
                onChange={(n) => handleInputChange('selling_price', n ? String(n) : '')}
              />
              <Switch
                checked={formData.is_sellable}
                onChange={(checked) => setFormData((prev) => ({ ...prev, is_sellable: checked }))}
                label="Sellable"
                description="Show in Sales and Cashier"
              />
            </div>

            <Select
              label="Size"
              options={sizeOptions}
              value={formData.size_label}
              onChange={(e) => handleInputChange('size_label', e.target.value)}
              searchPlaceholder="Search or type a size"
              allowCustom
            />

            <Select
              label="Color"
              options={colorOptions}
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              searchPlaceholder="Search or type a color"
              allowCustom
            />

            <Select
              label="Brand"
              options={brandOptions}
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              searchPlaceholder="Search or type a brand"
              allowCustom
            />

            <Select
              label="Category & Subcategory"
              options={[
                { value: '', label: 'Select Category (Optional)' },
                ...flattenCategories(categories).map(category => ({
                  value: category.id,
                  label: category.name
                }))
              ]}
              value={formData.category_id}
              onChange={(e) => handleInputChange('category_id', e.target.value)}
              disabled={loadingCategories}
            />
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter item description"
            fullWidth
          />

          <Input
            label="Tags"
            value={formData.tags}
            onChange={(e) => handleInputChange('tags', e.target.value)}
            placeholder="Enter tags separated by commas (e.g., formal, trousers, standard)"
            fullWidth
          />

          <div className="space-y-2">
            <FilePick
              id="thumbnail-upload-add"
              label="Thumbnail"
              accept="image/*"
              disabled={uploading}
              buttonLabel={uploading ? 'Processing…' : 'Choose photo'}
              onChange={(file) => handleImageSelect(file)}
              error={errors.image}
            />
            {previewUrl && (
              <Image
                src={previewUrl}
                alt="Thumbnail preview"
                width={96}
                height={96}
                className="h-24 w-24 rounded-xl object-cover ring-1 ring-black/10"
              />
            )}
          </div>

          {errors.submit && (
            <div className="text-sm text-red-600">{errors.submit}</div>
          )}
        </form>
    </SimpleModal>
  );
}
