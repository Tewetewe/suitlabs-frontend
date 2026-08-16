'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Plus } from 'lucide-react';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState, Pagination } from '@/components/ui/DataDisplay';
import SimpleModal from '@/components/modals/SimpleModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import type {
  AssetReport,
  CreateFixedAssetRequest,
  FixedAsset,
  FixedAssetCategory,
} from '@/types';

const CATEGORY_OPTIONS: { value: FixedAssetCategory; label: string }[] = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'fixture', label: 'Fixture' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'other', label: 'Other' },
];

const LIST_PAGE_SIZE = 10;

const PURCHASE_PAYMENT_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'debit', label: 'Debit' },
  { value: 'cc', label: 'Credit card' },
];

const emptyForm = (): CreateFixedAssetRequest => ({
  name: '',
  category: 'furniture',
  quantity: 1,
  purchase_price: 0,
  purchase_date: '',
  vendor: '',
  notes: '',
  payment_method: 'cash',
  on_credit: false,
});

function categoryLabel(value?: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label || value || '—';
}

function dateLabel(value?: string) {
  if (!value) return '—';
  return value.slice(0, 10);
}

export default function AssetsPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { success, error } = useToast();
  const [report, setReport] = useState<AssetReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FixedAsset | null>(null);
  const [form, setForm] = useState<CreateFixedAssetRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [fixedPage, setFixedPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setReport(await apiClient.getAssets());
      setLoadError(null);
      setFixedPage(1);
      setInventoryPage(1);
    } catch {
      setLoadError('Failed to load assets');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!isAdmin) {
      router.replace('/dashboard');
      return;
    }
    load();
  }, [authLoading, isAuthenticated, isAdmin, router, load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (asset: FixedAsset) => {
    setEditing(asset);
    setForm({
      name: asset.name,
      category: asset.category,
      quantity: asset.quantity,
      purchase_price: asset.purchase_price,
      purchase_date: dateLabel(asset.purchase_date) === '—' ? '' : dateLabel(asset.purchase_date),
      vendor: asset.vendor || '',
      notes: asset.notes || '',
      payment_method: 'cash',
      on_credit: false,
    });
    setModalOpen(true);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || form.quantity < 1 || form.purchase_price < 0) {
      error('Check the form', 'Name, quantity, and buying price are required.');
      return;
    }
    try {
      setSaving(true);
      const payload: CreateFixedAssetRequest = {
        ...form,
        name: form.name.trim(),
        vendor: form.vendor?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
        purchase_date: form.purchase_date || undefined,
      };
      if (editing) {
        await apiClient.updateFixedAsset(editing.id, payload);
        success('Fixed asset updated');
      } else {
        await apiClient.createFixedAsset(payload);
        success('Fixed asset recorded');
      }
      setModalOpen(false);
      await load();
    } catch {
      error('Could not save fixed asset', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDispose = async (asset: FixedAsset) => {
    const nextStatus = asset.status === 'in_use' ? 'disposed' : 'in_use';
    try {
      await apiClient.updateFixedAsset(asset.id, { status: nextStatus });
      success(nextStatus === 'disposed' ? 'Marked as disposed' : 'Marked as in use');
      await load();
    } catch {
      error('Could not update status', 'Please try again.');
    }
  };

  const handleDelete = async (asset: FixedAsset) => {
    if (!window.confirm(`Delete ${asset.name}? This removes it from the register.`)) return;
    try {
      await apiClient.deleteFixedAsset(asset.id);
      success('Fixed asset deleted');
      await load();
    } catch {
      error('Could not delete fixed asset', 'Please try again.');
    }
  };

  const inventory = report?.inventory;
  const fixed = report?.fixed;
  const fixedItems = fixed?.items || [];
  const inventoryItems = inventory?.items || [];
  const fixedTotalPages = Math.max(1, Math.ceil(fixedItems.length / LIST_PAGE_SIZE));
  const inventoryTotalPages = Math.max(1, Math.ceil(inventoryItems.length / LIST_PAGE_SIZE));
  const pagedFixed = fixedItems.slice((fixedPage - 1) * LIST_PAGE_SIZE, fixedPage * LIST_PAGE_SIZE);
  const pagedInventory = inventoryItems.slice((inventoryPage - 1) * LIST_PAGE_SIZE, inventoryPage * LIST_PAGE_SIZE);

  return (
    <DashboardLayout>
      <PageShell
        title="Assets"
        subtitle="Inventory products plus shop equipment such as chairs. Buying price is admin-only."
      >
        {!isAdmin ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={<Landmark className="h-6 w-6" />}
                title="Access denied"
                description="Only administrators can see shop assets."
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                <div className="text-xs font-semibold text-slate-500">Total assets</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {loading ? '—' : formatCurrency(report?.total_value || 0)}
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                <div className="text-xs font-semibold text-slate-500">Inventory</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {loading ? '—' : formatCurrency(inventory?.total_value || 0)}
                </div>
                <div className="text-xs text-slate-500">
                  {(inventory?.item_count || 0).toLocaleString()} products · {(inventory?.total_quantity || 0).toLocaleString()} units
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
                <div className="text-xs font-semibold text-slate-500">Fixed assets</div>
                <div className="mt-1 text-lg font-bold text-slate-900">
                  {loading ? '—' : formatCurrency(fixed?.total_value || 0)}
                </div>
                <div className="text-xs text-slate-500">
                  {(fixed?.item_count || 0).toLocaleString()} in use · {(fixed?.total_quantity || 0).toLocaleString()} units
                </div>
              </div>
            </div>

            {loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
            )}

            <Card>
              <CardContent>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Fixed assets</div>
                    <div className="text-xs text-slate-500">Chairs, racks, steamer, and other shop equipment.</div>
                  </div>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add fixed asset
                  </Button>
                </div>
                {(fixed?.by_category || []).length > 0 && (
                  <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(fixed?.by_category || []).map((row) => (
                      <div key={row.category} className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-sm">
                        <span className="text-slate-600">{categoryLabel(row.category)} · {row.quantity} units</span>
                        <span className="font-medium text-slate-900">{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(fixed?.items || []).length === 0 ? (
                  <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                    No fixed assets yet. Add chairs, racks, and other shop equipment.
                  </div>
                ) : (
                  <>
                  <div className="overflow-x-auto rounded-2xl border border-black/5">
                    <table className="min-w-full text-sm">
                      <thead className="bg-white/60">
                        <tr className="text-left text-slate-600">
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Category</th>
                          <th className="px-4 py-3 font-semibold text-right">Qty</th>
                          <th className="px-4 py-3 font-semibold text-right">Buying price</th>
                          <th className="px-4 py-3 font-semibold text-right">Value</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 bg-white/30">
                        {pagedFixed.map((asset) => (
                          <tr key={asset.id} className={asset.status === 'disposed' ? 'text-slate-400' : 'text-slate-800'}>
                            <td className="px-4 py-3 font-medium">
                              {asset.name}
                              {asset.vendor ? <div className="text-xs font-normal text-slate-500">{asset.vendor}</div> : null}
                            </td>
                            <td className="px-4 py-3">{categoryLabel(asset.category)}</td>
                            <td className="px-4 py-3 text-right">{asset.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(asset.purchase_price)}</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(asset.value)}</td>
                            <td className="px-4 py-3">
                              <Badge variant={asset.status === 'in_use' ? 'success' : 'default'}>
                                {asset.status === 'in_use' ? 'In use' : 'Disposed'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEdit(asset)}>Edit</Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDispose(asset)}>
                                  {asset.status === 'in_use' ? 'Dispose' : 'Restore'}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(asset)}>Delete</Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    className="mt-3"
                    page={Math.min(fixedPage, fixedTotalPages)}
                    totalPages={fixedTotalPages}
                    total={fixedItems.length}
                    perPage={LIST_PAGE_SIZE}
                    onPageChange={setFixedPage}
                  />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="mb-3 text-sm font-semibold text-slate-800">Inventory by product type</div>
                {(inventory?.by_type || []).length === 0 ? (
                  <div className="text-sm text-slate-500">No inventory value recorded yet. Add buying price on each item.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {(inventory?.by_type || []).map((row) => (
                      <div key={row.type} className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-sm">
                        <span className="capitalize text-slate-600">{row.type} · {row.quantity} units</span>
                        <span className="font-medium text-slate-900">{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div>
              <div className="mb-2 text-sm font-semibold text-slate-800">Inventory products</div>
              {inventoryItems.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                  No inventory value recorded yet. Add buying price on each item.
                </div>
              ) : (
                <>
              <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold text-right">Buying price</th>
                    <th className="px-4 py-3 font-semibold text-right">Asset value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  {pagedInventory.map((item) => (
                    <tr key={item.id} className="text-slate-800">
                      <td className="px-4 py-3 font-medium">{item.code}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3 capitalize">{item.type}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.purchase_price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(item.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <Pagination
                className="mt-3"
                page={Math.min(inventoryPage, inventoryTotalPages)}
                totalPages={inventoryTotalPages}
                total={inventoryItems.length}
                perPage={LIST_PAGE_SIZE}
                onPageChange={setInventoryPage}
              />
                </>
              )}
            </div>
          </>
        )}
      </PageShell>

      <SimpleModal
        isOpen={modalOpen}
        title={editing ? 'Edit fixed asset' : 'Add fixed asset'}
        onClose={() => setModalOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" form="fixed-asset-form" loading={saving}>Save</Button>
          </>
        }
      >
        <form id="fixed-asset-form" onSubmit={handleSave} className="space-y-4">
          <Input
            label="Name"
            required
            placeholder="e.g. Waiting chair"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Select
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as FixedAssetCategory }))}
          />
          <Input
            label="Quantity"
            type="number"
            min={1}
            required
            value={form.quantity || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
          />
          <Input
            label="Buying price (per unit, IDR)"
            type="number"
            min={0}
            required
            value={form.purchase_price || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, purchase_price: Number(e.target.value) }))}
          />
          {form.purchase_price > 0 && (
            <>
              <Select
                label="Paid with"
                options={PURCHASE_PAYMENT_OPTIONS}
                value={form.payment_method || 'cash'}
                onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value as CreateFixedAssetRequest['payment_method'] }))}
                disabled={form.on_credit}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!form.on_credit}
                  onChange={(e) => setForm((prev) => ({ ...prev, on_credit: e.target.checked }))}
                />
                On credit (Payable)
              </label>
            </>
          )}
          <Input
            label="Purchase date"
            type="date"
            value={form.purchase_date || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, purchase_date: e.target.value }))}
          />
          <Input
            label="Vendor"
            placeholder="Optional"
            value={form.vendor || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))}
          />
          <Input
            label="Notes"
            placeholder="Optional"
            value={form.notes || ''}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </form>
      </SimpleModal>
    </DashboardLayout>
  );
}
