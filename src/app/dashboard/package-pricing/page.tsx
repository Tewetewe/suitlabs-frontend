'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { Select } from '@/components/ui/Select';
import { PackagePricing } from '@/types';
import { PageShell } from '@/components/ui/PageShell';
import { FilterBar, EmptyState, SkeletonRow } from '@/components/ui/DataDisplay';
import { useToast } from '@/contexts/ToastContext';
import SimpleModal from '@/components/modals/SimpleModal';
import { Plus } from 'lucide-react';

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helperText?: string;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={[
          'block w-full rounded-xl border text-slate-900',
          'glass-control',
          'placeholder:text-slate-400 text-sm',
          'px-3 py-2 touch-manipulation resize-y',
          'border-black/10 focus:border-indigo-500/60 focus:ring-indigo-500/40',
          'focus:outline-none focus:ring-1 transition-colors',
        ].join(' ')}
      />
      {helperText && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}

export default function PackagePricingPage() {
  const [pricings, setPricings] = useState<PackagePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<{
    package_name: string;
    duration_hours: number;
    price: number | '';
    description: string;
  }>({ package_name: '', duration_hours: 24, price: '', description: '' });
  const [search, setSearch] = useState('');
  const { success, error } = useToast();

  useEffect(() => {
    loadPricings();
  }, []);

  const loadPricings = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPackagePricing();
      setPricings(data);
    } catch (e) {
      console.error('Failed to load package pricing', e);
      setPricings([]);
      error('Unable to load packages', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pricings.filter(p => (p.package_name || '').toLowerCase().includes(q));
  }, [pricings, search]);

  const resetForm = () => setForm({ package_name: '', duration_hours: 24, price: '', description: '' });

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    resetForm();
  };

  const handleCreate = async () => {
    const price = typeof form.price === 'string' ? Number(form.price) : form.price;
    if (!form.package_name || form.duration_hours <= 0 || !price || price <= 0) return;
    try {
      setCreating(true);
      await apiClient.createPackagePricing({ ...form, price });
      resetForm();
      await loadPricings();
      success('Package created', form.package_name);
      setIsFormOpen(false);
    } catch (e) {
      console.error('Failed to create pricing', e);
      error('Create failed', 'Please check the fields and try again.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: PackagePricing) => {
    setEditingId(p.id);
    setForm({ package_name: p.package_name, duration_hours: p.duration_hours, price: p.price, description: p.description || '' });
    setIsFormOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const price = typeof form.price === 'string' ? Number(form.price) : form.price;
      await apiClient.updatePackagePricing(editingId, { ...form, price: price || 0 });
      setEditingId(null);
      resetForm();
      await loadPricings();
      success('Package updated', form.package_name);
      setIsFormOpen(false);
    } catch (e) {
      console.error('Failed to update pricing', e);
      error('Update failed', 'Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const pkg = pricings.find(p => p.id === id);
      const ok = confirm(`Delete package${pkg?.package_name ? ` "${pkg.package_name}"` : ''}?`);
      if (!ok) return;
      await apiClient.deletePackagePricing(id);
      await loadPricings();
      success('Package deleted');
    } catch (e) {
      console.error('Failed to delete pricing', e);
      error('Delete failed', 'Please try again.');
    }
  };

  const formatDurationLabel = (hours: number) => {
    if (hours % 24 === 0 && hours >= 24) {
      const days = hours / 24;
      return days === 1 ? '1 day' : `${days} days`;
    }
    return `${hours} hours`;
  };

  const durationOptions = [4, 6, 8, 12, 24, 36, 48, 72, 96, 120, 144, 168]
    .map(h => ({ value: String(h), label: formatDurationLabel(h) }));

  return (
    <DashboardLayout>
      <PageShell
        title="Package Pricing"
        subtitle="Manage rental package durations and prices"
        action={
          <Button
            size="md"
            onClick={() => {
              setEditingId(null);
              resetForm();
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New package
          </Button>
        }
      >
        <FilterBar>
          <Input
            label="Search packages"
            placeholder="Type a package name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </FilterBar>

        <SimpleModal
          isOpen={isFormOpen}
          title={editingId ? 'Edit package' : 'New package'}
          onClose={closeForm}
          size="lg"
          footer={
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={closeForm}
                disabled={creating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              {editingId ? (
                <Button
                  onClick={handleUpdate}
                  disabled={creating || !form.package_name || !form.duration_hours || !form.price || Number(form.price) <= 0}
                  className="w-full sm:w-auto"
                >
                  Save changes
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  loading={creating}
                  disabled={creating || !form.package_name || !form.duration_hours || !form.price || Number(form.price) <= 0}
                  className="w-full sm:w-auto"
                >
                  Create package
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4">
            <div className="text-sm text-slate-600">
              Duration and price are required.
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Package name"
                placeholder="e.g. Wedding Package"
                value={form.package_name}
                onChange={e => setForm({ ...form, package_name: e.target.value })}
                helperText="Shown to staff on the package list."
              />

              <Select
                label="Duration"
                value={String(form.duration_hours)}
                onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })}
                options={durationOptions}
                helperText="How long the rental lasts."
              />

              <Input
                label="Price (Rp)"
                type="number"
                inputMode="numeric"
                placeholder="e.g. 1200000"
                value={form.price}
                onChange={e => {
                  const raw = e.target.value;
                  setForm({ ...form, price: raw === '' ? '' : Number(raw) });
                }}
                helperText="Total package price."
                min={0}
              />

              <TextAreaField
                label="Description (optional)"
                placeholder="What’s included in this package…"
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
                helperText="Helps staff quickly understand the package."
              />
            </div>
          </div>
        </SimpleModal>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No packages found"
              description="Create your first package pricing above"
            />
          ) : (
            filtered.map(p => (
              <Card key={p.id}>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-slate-900 break-words">
                        {p.package_name}
                      </div>
                      <div className="mt-0.5 text-sm text-slate-600">
                        {formatDurationLabel(p.duration_hours)} • {formatCurrency(p.price)}
                      </div>
                      {p.description && (
                        <div className="text-sm text-slate-500 mt-1 break-words">
                          {p.description}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 sm:shrink-0">
                      <Button variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                      <Button variant="ghost" onClick={() => handleDelete(p.id)}>Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageShell>
    </DashboardLayout>
  );
}


