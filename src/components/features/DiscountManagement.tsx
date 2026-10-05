'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { FieldGroup, Input, Textarea } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/contexts/ToastContext';
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
import { Badge, EmptyState, OverflowMenu, OverflowMenuItem } from '@/components/ui/DataDisplay';
import { PageShell } from '@/components/ui/PageShell';

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
  /** One message per field, keyed by the field name, plus `submit` for the API. */
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const customerLabelCache = React.useRef<Record<string, string>>({});
  const { success: toastSuccess, error: toastError } = useToast();

  /** Named apart from the DOM `FormData` global on purpose. */
  type DiscountForm = typeof formData;

  /** Write one field and drop the message that field was showing. */
  const updateField = <K extends keyof DiscountForm>(field: K, value: DiscountForm[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => (prev[field] || prev.submit ? { ...prev, [field]: '', submit: '' } : prev));
  };

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

  /**
   * Every field the form can complain about, in the order the form shows them.
   * `handleSubmit` focuses the first one that carries a message, so a fault far
   * down a long form does not hide below the fold.
   */
  const FIELD_IDS: Array<[string, string]> = [
    ['name', 'discount-name'],
    ['discount_value', 'discount-value'],
    ['max_discount_amount', 'discount-max'],
    ['end_date', 'discount-end-date'],
    ['usage_limit', 'discount-usage-limit'],
    ['target_value', 'discount-customers'],
  ];

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Enter a name staff will recognise.';
    }
    const value = parseFloat(formData.discount_value);
    if (!Number.isFinite(value) || value <= 0) {
      errors.discount_value = 'Enter an amount above 0.';
    } else if (formData.discount_type === 'percentage' && value > 100) {
      errors.discount_value = 'A percentage cannot go over 100.';
    }
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      errors.end_date = 'The end date falls before the start date.';
    }
    if (formData.usage_limit && parseInt(formData.usage_limit) < 1) {
      errors.usage_limit = 'Enter 1 or more, or leave it empty for unlimited.';
    }
    if (formData.target_type === 'specific_customers' && formData.target_value.length === 0) {
      errors.target_value = 'Add at least one customer.';
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const first = FIELD_IDS.find(([field]) => errors[field]);
      if (first) {
        const el = document.getElementById(first[1]);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus({ preventScroll: true });
      }
      return;
    }
    setFormErrors({});
    setSaving(true);

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
      
      toastSuccess(editingDiscount ? 'Discount updated' : 'Discount created', formData.name);
      resetForm();
      loadDiscounts();
    } catch (error) {
      // The modal stays open on a failure so nobody retypes 15 fields. The
      // banner keeps the reason next to the Save button; the toast covers the
      // case where the form is scrolled away from the banner.
      console.error('Failed to save discount:', error);
      const reason = error instanceof Error ? error.message : 'Please try again.';
      setFormErrors({ submit: reason });
      toastError('Could not save the discount', reason);
    } finally {
      setSaving(false);
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
            <div className="flex justify-between"><span className="text-slate-600">Total Applications</span><span className="font-medium">{stats.total_applications}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Total Amount Saved</span><span className="font-medium">{safeCurrency(stats.total_amount_saved)}</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Average Discount</span><span className="font-medium">{safeCurrency(stats.average_discount_amount)}</span></div>
            <div className="border-t border-black/5 pt-3 mt-2">
              <div className="flex justify-between"><span className="text-slate-600">Usage</span><span className="font-medium">{summary.usage_count}/{summary.usage_limit === -1 ? 'Unlimited' : summary.usage_limit}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Total Saved</span><span className="font-medium">{safeCurrency(summary.total_saved)}</span></div>
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
              <div className="text-slate-600">No applications found</div>
            ) : (
              applications.map((app) => (
                <div key={app.id} className="flex justify-between rounded-xl border border-black/5 p-2">
                  <span className="text-slate-600">{new Date(app.applied_at).toLocaleDateString()}</span>
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
    setFormErrors({});
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
    updateField('target_value', [...formData.target_value, id]);
    setCustomerPickerValue('');
  };

  const removeTargetCustomer = (id: string) => {
    updateField('target_value', formData.target_value.filter((customerId) => customerId !== id));
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
    setFormErrors({});
    void loadCustomerLabels(normalizeTargetValue(discount.target_value));
  };

  /**
   * The form read back as one sentence. A 15-field form is easy to fill in and
   * hard to check, so the sentence carries every number that changes what the
   * customer pays.
   */
  const discountSummary = React.useMemo(() => {
    const value = parseFloat(formData.discount_value);
    if (!Number.isFinite(value) || value <= 0) {
      return 'Fill in the amount to see how this discount reads.';
    }
    const off = formData.discount_type === 'percentage' ? `${value}% off` : `${safeCurrency(value)} off`;
    const scope =
      formData.applicable_to === 'booking' ? 'bookings' :
      formData.applicable_to === 'item' ? 'items' : 'bookings and items';
    const parts = [`${off} ${scope}`];
    if (formData.target_type === 'specific_customers') {
      const count = formData.target_value.length;
      parts.push(`for ${count} chosen customer${count === 1 ? '' : 's'}`);
    }
    if (formData.min_amount && parseFloat(formData.min_amount) > 0) {
      parts.push(`on bills from ${safeCurrency(formData.min_amount)}`);
    }
    if (formData.discount_type === 'percentage' && formData.max_discount_amount) {
      parts.push(`up to ${safeCurrency(formData.max_discount_amount)}`);
    }
    if (formData.code) {
      parts.push(`with code ${formData.code}`);
    }
    if (formData.usage_limit) {
      parts.push(`${formData.usage_limit} use${formData.usage_limit === '1' ? '' : 's'} in total`);
    }
    if (formData.start_date && formData.end_date) {
      parts.push(`from ${formData.start_date} to ${formData.end_date}`);
    } else if (formData.end_date) {
      parts.push(`until ${formData.end_date}`);
    } else if (formData.start_date) {
      parts.push(`from ${formData.start_date}`);
    }
    const sentence = `${parts.join(', ')}.`;
    return formData.is_active ? sentence : `${sentence} Switched off, so nobody can use it yet.`;
  }, [formData]);

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
    <PageShell
      title="Discounts"
      subtitle="Create and manage discount codes and promotions"
      action={
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4" />
          Create Discount
        </Button>
      }
    >
      <div className="border-b border-black/5">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {[
            { key: 'all', label: 'All Discounts', icon: Tag },
            { key: 'active', label: 'Active', icon: CheckCircle },
            { key: 'expired', label: 'Expiring', icon: Clock },
            { key: 'popular', label: 'Popular', icon: TrendingUp }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabKey)}
              className={`flex items-center whitespace-nowrap border-b-2 py-2 px-1 text-sm font-medium ${
                activeTab === key
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <SimpleModal
        isOpen={showCreateForm}
        title={editingDiscount ? 'Edit Discount' : 'Create Discount'}
        onClose={resetForm}
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
            <Button type="submit" form="discount-form" loading={saving}>
              {editingDiscount ? 'Update' : 'Create'} Discount
            </Button>
          </>
        }
      >
        <form id="discount-form" onSubmit={handleSubmit} className="space-y-6">
          {/* The plain-language read-back of the numbers below. Staff check this
              line instead of re-reading 15 fields before they save. */}
          <p className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-900 ring-1 ring-indigo-100">
            {discountSummary}
          </p>

          <FieldGroup title="Basics">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                id="discount-name"
                label="Discount name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                error={formErrors.name}
                placeholder="e.g. Wedding season 15%"
                required
              />
              <Input
                id="discount-code"
                label="Discount code (optional)"
                value={formData.code}
                onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                placeholder="e.g. WEDDING2026"
                helperText="Staff type this at checkout."
              />
              <Select
                label="Applies to"
                searchable={false}
                value={formData.applicable_to}
                onChange={(e) => updateField('applicable_to', e.target.value as DiscountForm['applicable_to'])}
                options={[
                  { value: 'booking', label: 'Bookings only' },
                  { value: 'item', label: 'Items only' },
                  { value: 'both', label: 'Bookings and items' },
                ]}
              />
            </div>
            <Textarea
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={2}
              helperText="Why this discount exists. Staff see it in the list."
            />
          </FieldGroup>

          <FieldGroup title="Amount">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Select
                label="Type"
                searchable={false}
                value={formData.discount_type}
                onChange={(e) => updateField('discount_type', e.target.value as DiscountForm['discount_type'])}
                options={[
                  { value: 'percentage', label: 'Percentage off' },
                  { value: 'amount', label: 'Fixed amount off' },
                ]}
              />
              {formData.discount_type === 'percentage' ? (
                <Input
                  id="discount-value"
                  label="Percentage off"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => updateField('discount_value', e.target.value)}
                  error={formErrors.discount_value}
                  helperText="Between 1 and 100."
                  required
                  min="0"
                  max="100"
                  step="0.01"
                />
              ) : (
                <CurrencyInput
                  id="discount-value"
                  label="Amount off"
                  value={formData.discount_value}
                  onChange={(n) => updateField('discount_value', n ? String(n) : '')}
                  error={formErrors.discount_value}
                  required
                />
              )}
              <CurrencyInput
                label="Minimum bill"
                value={formData.min_amount}
                onChange={(n) => updateField('min_amount', n ? String(n) : '')}
                helperText="The discount waits until the bill reaches this. Empty means no minimum."
              />
              {/* A cap only means something for a percentage. A fixed amount is
                  already its own cap, so the field stays hidden. */}
              {formData.discount_type === 'percentage' && (
                <CurrencyInput
                  id="discount-max"
                  label="Most it can take off"
                  value={formData.max_discount_amount}
                  onChange={(n) => updateField('max_discount_amount', n ? String(n) : '')}
                  error={formErrors.max_discount_amount}
                  helperText="Caps a big bill. Empty means no cap."
                />
              )}
            </div>
          </FieldGroup>

          <FieldGroup title="When it runs">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                id="discount-start-date"
                label="Start date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
                helperText="Empty means it starts now."
              />
              <Input
                id="discount-end-date"
                label="End date"
                type="date"
                value={formData.end_date}
                min={formData.start_date || undefined}
                onChange={(e) => updateField('end_date', e.target.value)}
                error={formErrors.end_date}
                helperText="Empty means it runs until you switch it off."
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Who gets it">
            <Select
              label="Target"
              searchable={false}
              value={formData.target_type}
              onChange={(e) => {
                const target_type = e.target.value as DiscountTargetType;
                setFormData((prev) => ({
                  ...prev,
                  target_type,
                  target_value: target_type === prev.target_type ? prev.target_value : [],
                }));
                setFormErrors((prev) => ({ ...prev, target_value: '', submit: '' }));
              }}
              options={[
                { value: 'all', label: 'All customers and items' },
                { value: 'specific_customers', label: 'Specific customers' },
                { value: 'category', label: 'Specific category' },
                { value: 'item_type', label: 'Item type' },
                { value: 'specific_items', label: 'Specific items' },
                // A Customer carries no tier, so the backend refuses this
                // target. The option stays only while an old discount still
                // holds it, or the form would show an empty box.
                ...(formData.target_type === 'customer_tier'
                  ? [{ value: 'customer_tier', label: 'Customer tier (not supported — pick another)' }]
                  : []),
              ]}
              helperText="Category, item type and specific items match the items on the booking."
            />

            {formData.target_type === 'specific_customers' && (
              <div className="space-y-2">
                <AutoCompleteSelect
                  id="discount-customers"
                  label="Customers"
                  value={customerPickerValue}
                  onChange={(id) => addTargetCustomer(id)}
                  fetchOptions={fetchCustomerOptions}
                  placeholder="Search customers to include"
                  minQueryLength={2}
                  emptyMessage="No matching customers"
                  error={formErrors.target_value}
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
                  {formData.target_value.length === 0
                    ? 'Only bookings for the customers you add here get this discount.'
                    : `${formData.target_value.length} customer${formData.target_value.length === 1 ? '' : 's'} added.`}
                </p>
              </div>
            )}
          </FieldGroup>

          <FieldGroup title="Limits">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                id="discount-usage-limit"
                label="Times it can be used"
                type="number"
                value={formData.usage_limit}
                onChange={(e) => updateField('usage_limit', e.target.value)}
                error={formErrors.usage_limit}
                helperText="Empty means unlimited."
                min="1"
              />
              <Input
                id="discount-priority"
                label="Priority"
                type="number"
                value={formData.priority}
                onChange={(e) => updateField('priority', e.target.value)}
                helperText="The higher number wins when two discounts fit the same bill."
                min="0"
              />
            </div>
          </FieldGroup>

          <FieldGroup title="Switches">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Switch
                label="Needs a code"
                description="Staff type the code at checkout. Off means it applies on its own."
                checked={formData.requires_code}
                onChange={(checked) => updateField('requires_code', checked)}
              />
              <Switch
                label="Active"
                description="Off keeps the discount on file without offering it."
                checked={formData.is_active}
                onChange={(checked) => updateField('is_active', checked)}
              />
            </div>
          </FieldGroup>

          {formErrors.submit && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
              {formErrors.submit}
            </p>
          )}
        </form>
      </SimpleModal>

      {/* Discounts List */}
      <div className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent>
                <div className="animate-pulse">
                  <div className="mb-2 h-4 rounded-md bg-slate-200"></div>
                  <div className="mb-2 h-4 w-3/4 rounded-md bg-slate-200"></div>
                  <div className="h-4 w-1/2 rounded-md bg-slate-200"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : discounts.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-6 w-6" />}
            title="No discounts found"
            description="Create your first discount to start offering promotions"
            action={
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4" />
                Create Discount
              </Button>
            }
          />
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
    </PageShell>
  );
}