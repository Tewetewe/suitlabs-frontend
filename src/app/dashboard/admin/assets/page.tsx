'use client';

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Plus, RotateCcw, Trash2, PackageX, Pencil } from 'lucide-react';

import { MetricTile, PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import {
  Badge,
  EmptyState,
  GroupedList,
  ListGroup,
  ListRow,
  OverflowMenu,
  OverflowMenuItem,
  SkeletonRow,
} from '@/components/ui/DataDisplay';
import SimpleModal from '@/components/modals/SimpleModal';
import { ConfirmModal } from '@/components/modals/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import { groupRows } from '@/lib/group-rows';
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

/** Track which groups are open, keyed by group. */
function useOpenGroups(keys: string[]) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return {
    open,
    toggle,
    expandAll: () => setOpen(new Set(keys)),
    collapseAll: () => setOpen(new Set()),
  };
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
  const [deletingAsset, setDeletingAsset] = useState<FixedAsset | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setReport(await apiClient.getAssets());
      setLoadError(null);
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

  const handleDelete = async () => {
    if (!deletingAsset) return;
    try {
      setDeleting(true);
      await apiClient.deleteFixedAsset(deletingAsset.id);
      success('Fixed asset deleted');
      setDeletingAsset(null);
      await load();
    } catch {
      error('Could not delete fixed asset', 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const inventory = report?.inventory;
  const fixed = report?.fixed;
  const fixedItems = useMemo(() => fixed?.items || [], [fixed]);
  const inventoryItems = useMemo(() => inventory?.items || [], [inventory]);

  const fixedGroups = useMemo(
    () => groupRows(fixedItems, {
      keyOf: (asset) => asset.category,
      titleOf: categoryLabel,
      unitsOf: (asset) => asset.quantity,
      valueOf: (asset) => asset.value,
    }),
    [fixedItems],
  );
  const inventoryGroups = useMemo(
    () => groupRows(inventoryItems, {
      keyOf: (item) => item.type,
      titleOf: (key) => key.charAt(0).toUpperCase() + key.slice(1),
      unitsOf: (item) => item.quantity,
      valueOf: (item) => item.value,
    }),
    [inventoryItems],
  );
  const fixedOpen = useOpenGroups(fixedGroups.map((g) => g.key));
  const inventoryOpen = useOpenGroups(inventoryGroups.map((g) => g.key));

  return (
    <>
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
              <MetricTile
                label="Total assets"
                loading={loading}
                value={formatCurrencyCompact(report?.total_value || 0)}
                title={formatCurrency(report?.total_value || 0)}
              />
              <MetricTile
                label="Inventory"
                loading={loading}
                value={formatCurrencyCompact(inventory?.total_value || 0)}
                title={formatCurrency(inventory?.total_value || 0)}
                sub={`${(inventory?.item_count || 0).toLocaleString()} products · ${(inventory?.total_quantity || 0).toLocaleString()} units`}
              />
              <MetricTile
                label="Fixed assets"
                loading={loading}
                value={formatCurrencyCompact(fixed?.total_value || 0)}
                title={formatCurrency(fixed?.total_value || 0)}
                sub={`${(fixed?.item_count || 0).toLocaleString()} in use · ${(fixed?.total_quantity || 0).toLocaleString()} units`}
              />
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
                {loading ? (
                  <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/40">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                  </div>
                ) : fixedItems.length === 0 ? (
                  <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                    No fixed assets yet. Add chairs, racks, and other shop equipment.
                  </div>
                ) : (
                  <GroupedList
                    label="Fixed assets by category"
                    groupCount={fixedGroups.length}
                    openCount={fixedOpen.open.size}
                    onExpandAll={fixedOpen.expandAll}
                    onCollapseAll={fixedOpen.collapseAll}
                  >
                    {fixedGroups.map((group) => (
                      <ListGroup
                        key={group.key}
                        title={group.title}
                        meta={`${group.rows.length} asset${group.rows.length === 1 ? '' : 's'} · ${group.units.toLocaleString()} units`}
                        value={formatCurrencyCompact(group.value)}
                        valueTitle={formatCurrency(group.value)}
                        open={fixedOpen.open.has(group.key)}
                        onToggle={() => fixedOpen.toggle(group.key)}
                      >
                        {group.rows.map((asset) => (
                          <ListRow
                            key={asset.id}
                            muted={asset.status === 'disposed'}
                            title={asset.name}
                            subtitle={asset.vendor || undefined}
                            meta={
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span>{asset.quantity.toLocaleString()} units</span>
                                <span aria-hidden>·</span>
                                <span>{formatCurrency(asset.purchase_price)} each</span>
                                {asset.purchase_date && (
                                  <>
                                    <span aria-hidden>·</span>
                                    <span>{dateLabel(asset.purchase_date)}</span>
                                  </>
                                )}
                                <Badge variant={asset.status === 'in_use' ? 'success' : 'default'}>
                                  {asset.status === 'in_use' ? 'In use' : 'Disposed'}
                                </Badge>
                              </span>
                            }
                            value={formatCurrency(asset.value)}
                            actions={
                              <OverflowMenu>
                                <OverflowMenuItem
                                  icon={<Pencil className="h-4 w-4 text-slate-400" />}
                                  onClick={() => openEdit(asset)}
                                >
                                  Edit
                                </OverflowMenuItem>
                                <OverflowMenuItem
                                  icon={
                                    asset.status === 'in_use'
                                      ? <PackageX className="h-4 w-4 text-slate-400" />
                                      : <RotateCcw className="h-4 w-4 text-slate-400" />
                                  }
                                  onClick={() => handleDispose(asset)}
                                >
                                  {asset.status === 'in_use' ? 'Dispose' : 'Restore'}
                                </OverflowMenuItem>
                                <OverflowMenuItem
                                  danger
                                  icon={<Trash2 className="h-4 w-4" />}
                                  onClick={() => setDeletingAsset(asset)}
                                >
                                  Delete
                                </OverflowMenuItem>
                              </OverflowMenu>
                            }
                          />
                        ))}
                      </ListGroup>
                    ))}
                  </GroupedList>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="mb-3">
                  <div className="text-sm font-semibold text-slate-800">Inventory products</div>
                  <div className="text-xs text-slate-500">
                    Rental stock at buying price, grouped by product type. Open a type to see its products.
                  </div>
                </div>
                {loading ? (
                  <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/40">
                    {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
                  </div>
                ) : inventoryItems.length === 0 ? (
                  <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                    No inventory value recorded yet. Add buying price on each item.
                  </div>
                ) : (
                  <GroupedList
                    label="Inventory products by type"
                    groupCount={inventoryGroups.length}
                    openCount={inventoryOpen.open.size}
                    onExpandAll={inventoryOpen.expandAll}
                    onCollapseAll={inventoryOpen.collapseAll}
                  >
                    {inventoryGroups.map((group) => (
                      <ListGroup
                        key={group.key}
                        title={group.title}
                        meta={`${group.rows.length} product${group.rows.length === 1 ? '' : 's'} · ${group.units.toLocaleString()} units`}
                        value={formatCurrencyCompact(group.value)}
                        valueTitle={formatCurrency(group.value)}
                        open={inventoryOpen.open.has(group.key)}
                        onToggle={() => inventoryOpen.toggle(group.key)}
                      >
                        {group.rows.map((item) => (
                          <ListRow
                            key={item.id}
                            title={item.name}
                            subtitle={item.code}
                            meta={`${item.quantity.toLocaleString()} units · ${formatCurrency(item.purchase_price)} each`}
                            value={formatCurrency(item.value)}
                          />
                        ))}
                      </ListGroup>
                    ))}
                  </GroupedList>
                )}
              </CardContent>
            </Card>

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
            searchable={false}
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
          <CurrencyInput
            label="Buying price (per unit)"
            required
            value={form.purchase_price || ''}
            onChange={(n) => setForm((prev) => ({ ...prev, purchase_price: n }))}
          />
          {form.purchase_price > 0 && (
            <>
              <Select
                searchable={false}
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
      <ConfirmModal
        isOpen={!!deletingAsset}
        title="Delete fixed asset"
        description={deletingAsset ? `Delete ${deletingAsset.name}? This removes it from the register.` : undefined}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onClose={() => setDeletingAsset(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
