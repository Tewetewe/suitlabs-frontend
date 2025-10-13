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

export default function PackagePricingPage() {
  const [pricings, setPricings] = useState<PackagePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ package_name: '', duration_hours: 24, price: 0, description: '' });
  const [search, setSearch] = useState('');

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
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pricings.filter(p => (p.package_name || '').toLowerCase().includes(q));
  }, [pricings, search]);

  const resetForm = () => setForm({ package_name: '', duration_hours: 24, price: 0, description: '' });

  const handleCreate = async () => {
    if (!form.package_name || form.duration_hours <= 0 || form.price <= 0) return;
    try {
      setCreating(true);
      await apiClient.createPackagePricing(form);
      resetForm();
      await loadPricings();
    } catch (e) {
      console.error('Failed to create pricing', e);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (p: PackagePricing) => {
    setEditingId(p.id);
    setForm({ package_name: p.package_name, duration_hours: p.duration_hours, price: p.price, description: p.description || '' });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      await apiClient.updatePackagePricing(editingId, form);
      setEditingId(null);
      resetForm();
      await loadPricings();
    } catch (e) {
      console.error('Failed to update pricing', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deletePackagePricing(id);
      await loadPricings();
    } catch (e) {
      console.error('Failed to delete pricing', e);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Package Pricing</h1>
            <p className="text-sm text-gray-500">Manage rental package durations and prices</p>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <Input placeholder="Search packages..." value={search} onChange={e => setSearch(e.target.value)} />
              <Input placeholder="Name" value={form.package_name} onChange={e => setForm({ ...form, package_name: e.target.value })} />
              <div className="md:-mt-1 mt-0">
                <Select
                  label="Duration"
                  value={String(form.duration_hours)}
                  onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })}
                  options={durationOptions}
                />
              </div>
              <Input type="number" placeholder="Price" value={form.price}
                onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              <Input placeholder="Description" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="mt-3 flex gap-2">
              {editingId ? (
                <>
                  <Button onClick={handleUpdate}>Update</Button>
                  <Button variant="ghost" onClick={() => { setEditingId(null); resetForm(); }}>Cancel</Button>
                </>
              ) : (
                <Button onClick={handleCreate} disabled={creating}>Create</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent><div className="h-6 bg-gray-100 rounded animate-pulse" /></CardContent></Card>
            ))
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-gray-500">No packages found</CardContent></Card>
          ) : (
            filtered.map(p => (
              <Card key={p.id}>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{p.package_name}</div>
                      <div className="text-sm text-gray-600">{formatDurationLabel(p.duration_hours)} • {formatCurrency(p.price)}</div>
                      {p.description && <div className="text-sm text-gray-500 mt-1">{p.description}</div>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
                      <Button variant="ghost" onClick={() => handleDelete(p.id)}>Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}


