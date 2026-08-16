'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { apiClient } from '@/lib/api';
import { Customer, Discount } from '@/types';
import { formatCurrency } from '@/lib/currency';
import { customerOptionLabel } from '@/lib/branch-scope';
import AutoCompleteSelect from '@/components/ui/AutoCompleteSelect';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  TrendingUp, 
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import GenericDeleteConfirmModal from '@/components/modals/GenericDeleteConfirmModal';
import SimpleModal from '@/components/modals/SimpleModal';
import { Badge, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';

type DiscountTargetType = 'category' | 'item_type' | 'customer_tier' | 'specific_items' | 'specific_customers' | 'all';

function normalizeTargetValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeTargetValue(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

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
    target_type: 'all' as DiscountTargetType,
    target_value: [] as string[],
    start_date: '',
    end_date: '',
    usage_limit: '',
    requires_code: false,
    is_active: true,
    priority: '0'
  });
  const [customerLabels, setCustomerLabels] = useState<Record<string, string>>({});
  const [customerPickerValue, setCustomerPickerValue] = useState('');
  const [formError, setFormError] = useState('');
  const customerLabelCache = React.useRef<Record<string, string>>({});

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
    if (formData.target_type === 'specific_customers' && formData.target_value.length === 0) {
      setFormError('Select at least one customer for this discount.');
      return;
    }
    setFormError('');
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
    setCustomerPickerValue('');
    setFormError('');
  };

  const loadCustomerLabels = async (ids: string[]) => {
    const missing = ids.filter((id) => id && !customerLabels[id]);
    if (missing.length === 0) return;
    const entries: Record<string, string> = {};
    await Promise.all(missing.map(async (id) => {
      try {
        const customer = await apiClient.getCustomer(id);
        entries[id] = customerOptionLabel(customer);
      } catch {
        entries[id] = id;
      }
      customerLabelCache.current[id] = entries[id];
    }));
    setCustomerLabels((prev) => ({ ...prev, ...entries }));
  };

  const fetchCustomerOptions = async (query: string) => {
    const selected = new Set(formData.target_value);
    const toOptions = (customers: Customer[]) =>
      customers
        .filter((customer) => !selected.has(customer.id))
        .map((customer) => ({ value: customer.id, label: customerOptionLabel(customer) }));

    const customers = (query && query.trim().length >= 2)
      ? await apiClient.searchCustomers(query.trim())
      : ((await apiClient.getCustomers({ page: 1, limit: 50 }))?.data?.data?.customers as Customer[] | undefined) || [];

    const options = toOptions(customers);
    setCustomerLabels((prev) => {
      const next = { ...prev };
      for (const option of options) {
        next[option.value] = option.label;
        customerLabelCache.current[option.value] = option.label;
      }
      return next;
    });
    return options;
  };

  const addTargetCustomer = (id: string, label?: string) => {
    if (!id || formData.target_value.includes(id)) {
      setCustomerPickerValue('');
      return;
    }
    const resolvedLabel = label || customerLabelCache.current[id];
    if (resolvedLabel) {
      setCustomerLabels((prev) => ({ ...prev, [id]: resolvedLabel }));
    } else {
      void loadCustomerLabels([id]);
    }
    setFormData({ ...formData, target_value: [...formData.target_value, id] });
    setCustomerPickerValue('');
    setFormError('');
  };

  const removeTargetCustomer = (id: string) => {
    setFormData({ ...formData, target_value: formData.target_value.filter((customerId) => customerId !== id) });
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
      target_type: (discount.target_type || 'all') as DiscountTargetType,
      target_value: normalizeTargetValue(discount.target_value),
      start_date: toDateInputValue(discount.start_date),
      end_date: toDateInputValue(discount.end_date),
      usage_limit: discount.usage_limit?.toString() || '',
      requires_code: discount.requires_code,
      is_active: discount.is_active,
      priority: discount.priority?.toString() || '0'
    });
    setEditingDiscount(discount);
    setShowCreateForm(true);
    setFormError('');
    void loadCustomerLabels(normalizeTargetValue(discount.target_value));
  };

  const getDiscountStatus = (discount: Discount) => {
    if (!discount.is_active) return { status: 'inactive', variant: 'default' as const };
    
    const now = new Date();
    const startDate = discount.start_date ? new Date(discount.start_date) : null;
    const endDate = discount.end_date ? new Date(discount.end_date) : null;
    
    if (startDate && now < startDate) return { status: 'scheduled', variant: 'primary' as const };
    if (endDate && now > endDate) return { status: 'expired', variant: 'danger' as const };
    if (discount.usage_limit && discount.usage_count && discount.usage_count >= discount.usage_limit) {
      return { status: 'limit reached', variant: 'warning' as const };
    }
    
    return { status: 'active', variant: 'success' as const };
  };

  return (
    <div className="space-y-4">
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
                
                <Select
                  label="Discount Type"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'amount' })}
                  options={[
                    { value: 'percentage', label: 'Percentage' },
                    { value: 'amount', label: 'Fixed Amount' },
                  ]}
                />
                <Select
                  label="Applicable To"
                  value={formData.applicable_to}
                  onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as 'booking' | 'item' | 'both' })}
                  options={[
                    { value: 'booking', label: 'Booking Only' },
                    { value: 'item', label: 'Item Only' },
                    { value: 'both', label: 'Both Booking & Item' },
                  ]}
                />
                
                {formData.discount_type === 'percentage' ? (
                  <Input
                    label="Discount Value (%)"
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <CurrencyInput
                    label="Discount Value"
                    value={formData.discount_value}
                    onChange={(n) => setFormData({ ...formData, discount_value: n ? String(n) : '' })}
                    required
                  />
                )}
                
                <CurrencyInput
                  label="Minimum Amount"
                  value={formData.min_amount}
                  onChange={(n) => setFormData({ ...formData, min_amount: n ? String(n) : '' })}
                />
                
                <CurrencyInput
                  label="Maximum Discount Amount"
                  value={formData.max_discount_amount}
                  onChange={(n) => setFormData({ ...formData, max_discount_amount: n ? String(n) : '' })}
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

                <Select
                  label="Target Type"
                  value={formData.target_type}
                  onChange={(e) => {
                    const target_type = e.target.value as DiscountTargetType;
                    setFormData({
                      ...formData,
                      target_type,
                      target_value: target_type === formData.target_type ? formData.target_value : [],
                    });
                    setFormError('');
                  }}
                  options={[
                    { value: 'all', label: 'All customers & items' },
                    { value: 'specific_customers', label: 'Specific customers' },
                    { value: 'category', label: 'Specific Category' },
                    { value: 'item_type', label: 'Item Type' },
                    { value: 'customer_tier', label: 'Customer Tier' },
                    { value: 'specific_items', label: 'Specific Items' },
                  ]}
                />

                <Input
                  label="Priority (Higher = Applied First)"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  min="0"
                />
              </div>

              {formData.target_type === 'specific_customers' && (
                <div className="space-y-2">
                  <AutoCompleteSelect
                    label="Customers"
                    value={customerPickerValue}
                    onChange={(id) => addTargetCustomer(id)}
                    fetchOptions={fetchCustomerOptions}
                    placeholder="Search customers to include"
                    minQueryLength={2}
                    emptyMessage="No matching customers"
                  />
                  {formData.target_value.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.target_value.map((id) => (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 ring-1 ring-indigo-200"
                        >
                          {customerLabels[id] || id}
                          <button
                            type="button"
                            aria-label="Remove customer"
                            className="rounded-full p-0.5 text-indigo-500 hover:bg-indigo-100 hover:text-indigo-800"
                            onClick={() => removeTargetCustomer(id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    This discount can only be applied to bookings for the selected customers.
                  </p>
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              
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
      <div className="space-y-2">
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
            const value = discount.discount_type === 'percentage'
              ? `${discount.discount_value}%`
              : formatCurrency(discount.discount_value);
            const used = discount.usage_limit && discount.usage_limit > 0
              ? `${discount.usage_count || 0}/${discount.usage_limit}`
              : `${discount.usage_count || 0} used`;
            const customerCount = discount.target_type === 'specific_customers'
              ? normalizeTargetValue(discount.target_value).length
              : 0;
            const meta = [
              discount.code,
              value,
              discount.applicable_to,
              customerCount > 0 ? `${customerCount} customer${customerCount === 1 ? '' : 's'}` : null,
              used,
              discount.end_date ? `until ${new Date(discount.end_date).toLocaleDateString()}` : 'No expiry',
            ].filter(Boolean).join(' · ');

            return (
              <Card key={discount.id} padding="sm" className="relative z-0 [&:has(details[open])]:z-30">
                <CardContent className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{discount.name}</span>
                      <Badge variant={status.variant} className="capitalize">{status.status}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-500">{meta}</p>
                    {discount.description && (
                      <p className="mt-0.5 truncate text-xs text-slate-400">{discount.description}</p>
                    )}
                  </div>
                  <OverflowMenu>
                    <OverflowMenuItem icon={<Edit className="h-4 w-4 text-slate-400" />} onClick={() => startEdit(discount)}>
                      Edit
                    </OverflowMenuItem>
                    <OverflowMenuItem icon={<TrendingUp className="h-4 w-4 text-slate-400" />} onClick={() => handleViewStats(discount.id)}>
                      Statistics
                    </OverflowMenuItem>
                    <OverflowMenuItem icon={<CheckCircle className="h-4 w-4 text-slate-400" />} onClick={() => handleViewApplications(discount.id)}>
                      Applications
                    </OverflowMenuItem>
                    <OverflowMenuItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(discount.id)}>
                      Delete
                    </OverflowMenuItem>
                  </OverflowMenu>
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