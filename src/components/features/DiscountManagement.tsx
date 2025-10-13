'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { Discount } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  TrendingUp, 
  CheckCircle,
  Clock
} from 'lucide-react';
import GenericDeleteConfirmModal from '@/components/modals/GenericDeleteConfirmModal';
import SimpleModal from '@/components/modals/SimpleModal';

export function DiscountManagement() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'expired' | 'popular'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);
  const [statsModal, setStatsModal] = useState<{ open: boolean; title: string; body: React.ReactNode }>(
    { open: false, title: '', body: null }
  );
  const [appsModal, setAppsModal] = useState<{ open: boolean; title: string; body: React.ReactNode }>(
    { open: false, title: '', body: null }
  );

  type TabKey = 'all' | 'active' | 'expired' | 'popular';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'amount',
    discount_value: '',
    min_amount: '',
    max_discount_amount: '',
    applicable_to: 'booking' as 'booking' | 'item' | 'both',
    target_type: 'all' as 'category' | 'item_type' | 'customer_tier' | 'specific_items' | 'all',
    target_value: [] as string[],
    start_date: '',
    end_date: '',
    usage_limit: '',
    requires_code: false,
    is_active: true,
    priority: '0'
  });

  const toRFC3339 = (dateStr: string) => {
    try {
      return new Date(`${dateStr}T00:00:00Z`).toISOString();
    } catch {
      return undefined;
    }
  };

  const toDateInputValue = (isoOrDateLike?: string) => {
    if (!isoOrDateLike) return '';
    const d = new Date(isoOrDateLike);
    if (isNaN(d.getTime())) return '';
    // yyyy-mm-dd expected by <input type="date">
    return d.toISOString().slice(0, 10);
  };

  const safeCurrency = (value: unknown) => {
    const num = typeof value === 'number' ? value : Number(value ?? 0);
    return formatCurrency(Number.isFinite(num) ? num : 0);
  };

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      let data: unknown;
      switch (activeTab) {
        case 'active':
          data = await apiClient.getActiveDiscounts();
          break;
        case 'popular':
          data = await apiClient.getPopularDiscounts();
          break;
        case 'expired':
          data = await apiClient.getExpiringDiscounts();
          break;
        default:
          data = await apiClient.getDiscounts();
      }
      // Normalize various possible response shapes to an array
      const normalized: unknown = Array.isArray(data)
        ? data
        : (data as { data?: { data?: Discount[] } } | undefined)?.data?.data
          ?? (data as { data?: Discount[] } | undefined)?.data
          ?? [];
      setDiscounts(Array.isArray(normalized) ? normalized : []);
    } catch (error) {
      console.error('Failed to load discounts:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadDiscounts();
  }, [activeTab, loadDiscounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const discountData = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_amount: formData.min_amount ? parseFloat(formData.min_amount) : 0,
        max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : undefined,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : -1,
        priority: parseInt(formData.priority),
        start_date: formData.start_date ? toRFC3339(formData.start_date) : undefined,
        end_date: formData.end_date ? toRFC3339(formData.end_date) : undefined,
        code: formData.code || undefined
      };

      if (editingDiscount) {
        await apiClient.updateDiscount(editingDiscount.id, discountData);
      } else {
        await apiClient.createDiscount(discountData);
      }
      
      resetForm();
      loadDiscounts();
    } catch (error) {
      console.error('Failed to save discount:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (discountId: string) => {
    setConfirmDeleteId(discountId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setConfirmDeleteLoading(true);
    try {
      await apiClient.deleteDiscount(confirmDeleteId);
      setConfirmDeleteId(null);
      loadDiscounts();
    } catch (error) {
      console.error('Failed to delete discount:', error);
    } finally {
      setConfirmDeleteLoading(false);
    }
  };

  const handleViewStats = async (discountId: string) => {
    try {
      const stats = await apiClient.getDiscountStats(discountId);
      const summary = await apiClient.getDiscountSummary(discountId);

      setStatsModal({
        open: true,
        title: 'Discount Statistics',
        body: (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Total Applications</span><span className="font-medium">{stats.total_applications}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Total Amount Saved</span><span className="font-medium">{safeCurrency(stats.total_amount_saved)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Average Discount</span><span className="font-medium">{safeCurrency(stats.average_discount_amount)}</span></div>
            <div className="border-t pt-3 mt-2">
              <div className="flex justify-between"><span className="text-gray-600">Usage</span><span className="font-medium">{summary.usage_count}/{summary.usage_limit === -1 ? 'Unlimited' : summary.usage_limit}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total Saved</span><span className="font-medium">{safeCurrency(summary.total_saved)}</span></div>
            </div>
          </div>
        )
      });
    } catch (error) {
      console.error('Failed to load discount stats:', error);
    }
  };

  const handleViewApplications = async (discountId: string) => {
    try {
      const applications = await apiClient.getDiscountApplications(discountId);

      setAppsModal({
        open: true,
        title: `Applications (${applications.length})`,
        body: (
          <div className="space-y-2 text-sm">
            {applications.length === 0 ? (
              <div className="text-gray-600">No applications found</div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="flex justify-between border rounded p-2">
                  <span className="text-gray-600">{new Date(app.applied_at).toLocaleDateString()}</span>
                  <span className="font-medium">{formatCurrency(app.applied_amount)}</span>
                </div>
              ))
            )}
          </div>
        )
      });
    } catch (error) {
      console.error('Failed to load discount applications:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_amount: '',
      max_discount_amount: '',
      applicable_to: 'booking',
      target_type: 'all',
      target_value: [],
      start_date: '',
      end_date: '',
      usage_limit: '',
      requires_code: false,
      is_active: true,
      priority: '0'
    });
    setShowCreateForm(false);
    setEditingDiscount(null);
  };

  const startEdit = (discount: Discount) => {
    setFormData({
      name: discount.name,
      code: discount.code || '',
      description: discount.description || '',
      discount_type: discount.discount_type,
      discount_value: discount.discount_value.toString(),
      min_amount: discount.min_amount?.toString() || '',
      max_discount_amount: discount.max_discount_amount?.toString() || '',
      applicable_to: discount.applicable_to,
      target_type: discount.target_type || 'all',
      target_value: discount.target_value || [],
      start_date: toDateInputValue(discount.start_date),
      end_date: toDateInputValue(discount.end_date),
      usage_limit: discount.usage_limit?.toString() || '',
      requires_code: discount.requires_code,
      is_active: discount.is_active,
      priority: discount.priority?.toString() || '0'
    });
    setEditingDiscount(discount);
    setShowCreateForm(true);
  };

  const getDiscountStatus = (discount: Discount) => {
    if (!discount.is_active) return { status: 'inactive', color: 'text-gray-500' };
    
    const now = new Date();
    const startDate = discount.start_date ? new Date(discount.start_date) : null;
    const endDate = discount.end_date ? new Date(discount.end_date) : null;
    
    if (startDate && now < startDate) return { status: 'scheduled', color: 'text-blue-500' };
    if (endDate && now > endDate) return { status: 'expired', color: 'text-red-500' };
    if (discount.usage_limit && discount.usage_count && discount.usage_count >= discount.usage_limit) {
      return { status: 'limit reached', color: 'text-orange-500' };
    }
    
    return { status: 'active', color: 'text-green-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discount Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage discount codes and promotions
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Discount
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All Discounts', icon: Tag },
            { key: 'active', label: 'Active', icon: CheckCircle },
            { key: 'expired', label: 'Expiring', icon: Clock },
            { key: 'popular', label: 'Popular', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold mb-4">
              {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Discount Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                
                <Input
                  label="Discount Code (Optional)"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., SUMMER2024"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'amount' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="amount">Fixed Amount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Applicable To
                  </label>
                  <select
                    value={formData.applicable_to}
                    onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as 'booking' | 'item' | 'both' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="booking">Booking Only</option>
                    <option value="item">Item Only</option>
                    <option value="both">Both Booking & Item</option>
                  </select>
                </div>
                
                <Input
                  label={`Discount Value (${formData.discount_type === 'percentage' ? '%' : 'Rp'})`}
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                />
                
                <Input
                  label="Minimum Amount (Rp)"
                  type="number"
                  value={formData.min_amount}
                  onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                  min="0"
                  step="0.01"
                />
                
                <Input
                  label="Maximum Discount Amount (Rp)"
                  type="number"
                  value={formData.max_discount_amount}
                  onChange={(e) => setFormData({ ...formData, max_discount_amount: e.target.value })}
                  min="0"
                  step="0.01"
                />
                
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
                
                <Input
                  label="End Date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
                
                <Input
                  label="Usage Limit"
                  type="number"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  min="1"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Type
                  </label>
                  <select
                    value={formData.target_type}
                    onChange={(e) => setFormData({ ...formData, target_type: e.target.value as 'category' | 'item_type' | 'customer_tier' | 'specific_items' | 'all' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="all">All Items</option>
                    <option value="category">Specific Category</option>
                    <option value="item_type">Item Type</option>
                    <option value="customer_tier">Customer Tier</option>
                    <option value="specific_items">Specific Items</option>
                  </select>
                </div>

                <Input
                  label="Priority (Higher = Applied First)"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.requires_code}
                    onChange={(e) => setFormData({ ...formData, requires_code: e.target.checked })}
                    className="mr-2 h-4 w-4 accent-blue-600 border-gray-300"
                    style={{ appearance: 'auto' }}
                  />
                  Requires discount code
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2 h-4 w-4 accent-blue-600 border-gray-300"
                    style={{ appearance: 'auto' }}
                  />
                  Active
                </label>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  {editingDiscount ? 'Update' : 'Create'} Discount
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Discounts List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : discounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No discounts found</h3>
              <p className="text-gray-500 mb-4">
                Create your first discount to start offering promotions
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Discount
              </Button>
            </CardContent>
          </Card>
        ) : Array.isArray(discounts) ? (
          discounts.map((discount) => {
            const status = getDiscountStatus(discount);
            return (
              <Card key={discount.id}>
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className="text-lg font-semibold">{discount.name}</h3>
                        {discount.code && (
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {discount.code}
                          </span>
                        )}
                        <span className={`ml-2 text-sm font-medium ${status.color}`}>
                          {status.status}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{discount.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Value</p>
                          <p className="font-semibold">
                            {discount.discount_type === 'percentage' 
                              ? `${discount.discount_value}%` 
                              : formatCurrency(discount.discount_value)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Used</p>
                          <p className="font-semibold">
                            {discount.usage_count || 0}
                            {discount.usage_limit && discount.usage_limit > 0 && ` / ${discount.usage_limit}`}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Applicable To</p>
                          <p className="font-semibold capitalize">
                            {discount.applicable_to}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Priority</p>
                          <p className="font-semibold">
                            {discount.priority || 0}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Min Amount</p>
                          <p className="font-semibold">
                            {discount.min_amount ? formatCurrency(discount.min_amount) : 'None'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Max Discount</p>
                          <p className="font-semibold">
                            {discount.max_discount_amount ? formatCurrency(discount.max_discount_amount) : 'None'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Target</p>
                          <p className="font-semibold capitalize">
                            {discount.target_type || 'all'}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-500">Valid Until</p>
                          <p className="font-semibold">
                            {discount.end_date 
                              ? new Date(discount.end_date).toLocaleDateString()
                              : 'No expiry'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(discount)}
                        title="Edit Discount"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewStats(discount.id)}
                        title="View Statistics"
                      >
                        <TrendingUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewApplications(discount.id)}
                        title="View Applications"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(discount.id)}
                        title="Delete Discount"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent>
              <div className="text-sm text-red-600">Invalid discounts data.</div>
            </CardContent>
          </Card>
        )}
      </div>

      <GenericDeleteConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title="Discount"
        itemName={discounts.find(d => d.id === confirmDeleteId)?.name || ''}
        loading={confirmDeleteLoading}
      />

      <SimpleModal
        isOpen={statsModal.open}
        title={statsModal.title}
        onClose={() => setStatsModal({ ...statsModal, open: false })}
      >
        {statsModal.body}
      </SimpleModal>

      <SimpleModal
        isOpen={appsModal.open}
        title={appsModal.title}
        onClose={() => setAppsModal({ ...appsModal, open: false })}
      >
        {appsModal.body}
      </SimpleModal>
    </div>
  );
}