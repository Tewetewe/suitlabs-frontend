'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CreateItemRequest, Category } from '@/types';
import { apiClient } from '@/lib/api';
import { X } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CreateItemRequest) => Promise<void>;
}

export default function AddItemModal({ isOpen, onClose, onAdd }: AddItemModalProps) {
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
        type: formData.type as 'suit' | 'accessory' | 'shoes' | 'tie' | 'belt' | 'trousers' | 'shirts' | 'vest',
        brand: formData.brand.trim() || undefined,
        color: formData.color.trim() || undefined,
        size: formData.size_label.trim() ? { label: formData.size_label.trim() } : { label: '' },
        condition: formData.condition as 'excellent' | 'good' | 'fair' | 'poor',
        quantity: parseInt(formData.quantity),
        standard_price: parseFloat(formData.standard_price),
        one_day_price: parseFloat(formData.one_day_price),
        four_hour_price: parseFloat(formData.four_hour_price),
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Item</h2>
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
              label="Quantity *"
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              error={errors.quantity}
              placeholder="0"
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
            {previewUrl && (
              <div className="mb-3">
                <Image 
                  src={previewUrl} 
                  alt="Thumbnail Preview" 
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
                id="thumbnail-upload-add"
                className="hidden"
              />
              <label
                htmlFor="thumbnail-upload-add"
                className={`
                  inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors duration-200
                  ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {uploading ? 'Processing...' : 'Choose Thumbnail'}
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
              Add Item
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
