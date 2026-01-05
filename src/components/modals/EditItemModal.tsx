'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Item, CreateItemRequest, Category } from '@/types';
import { X } from 'lucide-react';
import apiClient from '@/lib/api';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, item: Partial<CreateItemRequest>) => Promise<void>;
  item: Item | null;
}

export default function EditItemModal({ isOpen, onClose, onUpdate, item }: EditItemModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: '',
    brand: '',
    color: '',
    size_label: '',
    condition: 'excellent',
    quantity: '',
    standard_price: '',
    one_day_price: '',
    four_hour_price: '',
    purchase_price: '',
    category_id: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await apiClient.getCategoryTree();
      console.log('Loaded categories:', data); // Debug log
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

  const toImageUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      // If it's already a full URL, return as is
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      // If it's a relative path, prepend the API base URL
      return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081'}${url.startsWith('/') ? '' : '/'}${url}`;
    } catch {
      return undefined;
    }
  };

  const typeOptions = [
    { value: '', label: 'Select Type' },
    { value: 'suit', label: 'Suit' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'tie', label: 'Tie' },
    { value: 'belt', label: 'Belt' },
    { value: 'trousers', label: 'Trousers' },
    { value: 'shirts', label: 'Shirts' },
    { value: 'vest', label: 'Vest' },
  ];

  const conditionOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
  ];

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      console.log('Item data:', item); // Debug log
      console.log('Item category:', item.category); // Debug log
      console.log('Item category_id:', item.category_id); // Debug log
      console.log('Category ID to set:', item.category?.id || item.category_id || ''); // Debug log
      setFormData({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        type: item.type || '',
        brand: item.brand || '',
        color: item.color || '',
        size_label: item.size?.label || '',
        condition: item.condition || 'excellent',
        quantity: item.quantity?.toString() || '0',
        standard_price: item.standard_price ? item.standard_price.toString() : '0.00',
        one_day_price: item.one_day_price ? item.one_day_price.toString() : '0.00',
        four_hour_price: item.four_hour_price ? item.four_hour_price.toString() : '0.00',
        purchase_price: item.purchase_price ? item.purchase_price.toString() : '0.00',
        category_id: item.category?.id || item.category_id || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : ''
      });
      console.log('Form data set with category_id:', item.category?.id || item.category_id || ''); // Debug log
      setPreviewUrl(item.thumbnail_url || null);
    }
  }, [item]);

  const handleImageSelect = async (file?: File | null) => {
    if (!file || !item) return;
    try {
      setUploading(true);
      const url = await apiClient.uploadItemImage(item.id, file);
      setPreviewUrl(url);
    } catch (e) {
      console.error('Failed to upload image', e);
      setErrors(prev => ({ ...prev, image: 'Failed to upload image' }));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    setErrors({});

    try {
      // Validate required fields
      const newErrors: Record<string, string> = {};
      if (!formData.code.trim()) newErrors.code = 'Code is required';
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.type) newErrors.type = 'Type is required';

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        setLoading(false);
        return;
      }

      const updateData: Partial<CreateItemRequest> = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type as 'suit' | 'accessory' | 'shoes' | 'tie' | 'belt' | 'trousers' | 'shirts' | 'vest',
        brand: formData.brand.trim() || undefined,
        color: formData.color.trim() || undefined,
        size: formData.size_label.trim() ? { label: formData.size_label.trim() } : undefined,
        condition: formData.condition as 'excellent' | 'good' | 'fair' | 'poor',
        standard_price: parseFloat(formData.standard_price) || 0,
        one_day_price: parseFloat(formData.one_day_price) || 0,
        four_hour_price: parseFloat(formData.four_hour_price) || 0,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        category_id: formData.category_id || '',
        thumbnail_url: previewUrl || undefined,
        tags: formData.tags.trim() ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };
      
      console.log('Updating item with category data:', updateData); // Debug log
      console.log('Form data category_id:', formData.category_id); // Debug log
      await onUpdate(item.id, updateData);

      onClose();
    } catch (error) {
      console.error('Failed to update item:', error);
      setErrors({ submit: 'Failed to update item. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log(`Form field ${field} changed to:`, value); // Debug log
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen || !item) return null;

  console.log('Current form data:', formData); // Debug log

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Edit Item</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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
              label="Type *"
              options={typeOptions}
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              error={errors.type}
            />

            <Select
              label="Condition"
              options={conditionOptions}
              value={formData.condition}
              onChange={(e) => handleInputChange('condition', e.target.value)}
            />

            <Input
              label="Standard Price (3-day) *"
              type="number"
              step="0.01"
              min="0"
              value={formData.standard_price}
              onChange={(e) => handleInputChange('standard_price', e.target.value)}
              error={errors.standard_price}
              placeholder="0.00"
            />

            <Input
              label="One Day Price *"
              type="number"
              step="0.01"
              min="0"
              value={formData.one_day_price}
              onChange={(e) => handleInputChange('one_day_price', e.target.value)}
              error={errors.one_day_price}
              placeholder="0.00"
            />

            <Input
              label="Four Hour Price *"
              type="number"
              step="0.01"
              min="0"
              value={formData.four_hour_price}
              onChange={(e) => handleInputChange('four_hour_price', e.target.value)}
              error={errors.four_hour_price}
              placeholder="0.00"
            />

            <Input
              label="Purchase Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.purchase_price}
              onChange={(e) => handleInputChange('purchase_price', e.target.value)}
              placeholder="0.00"
            />

            <Input
              label="Quantity *"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              error={errors.quantity}
              placeholder="0"
            />

            <Input
              label="Size"
              value={formData.size_label}
              onChange={(e) => handleInputChange('size_label', e.target.value)}
              placeholder="e.g., M, L, XL"
            />

            <Input
              label="Color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
              placeholder="e.g., Black, Navy, Gray"
            />

            <Input
              label="Brand"
              value={formData.brand}
              onChange={(e) => handleInputChange('brand', e.target.value)}
              placeholder="e.g., Mubeng, Goldy"
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
            <label className="text-sm font-medium text-gray-700">Thumbnail Image</label>
            {toImageUrl(previewUrl) && (
              <div className="mb-3">
                <Image 
                  src={toImageUrl(previewUrl)!} 
                  alt="Thumbnail" 
                  width={96} 
                  height={96} 
                  className="h-24 w-24 object-cover rounded border" 
                />
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                disabled={uploading}
                id="thumbnail-upload-edit"
                className="hidden"
              />
              <label
                htmlFor="thumbnail-upload-edit"
                className={`
                  inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {uploading ? 'Uploading...' : 'Choose Thumbnail'}
              </label>
            </div>
            {errors.image && <div className="text-red-600 text-sm">{errors.image}</div>}
          </div>

          {errors.submit && (
            <div className="text-red-600 text-sm">{errors.submit}</div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="h-12 sm:h-10 text-base sm:text-sm order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading}
              className="h-12 sm:h-10 text-base sm:text-sm order-1 sm:order-2"
            >
              Update Item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
