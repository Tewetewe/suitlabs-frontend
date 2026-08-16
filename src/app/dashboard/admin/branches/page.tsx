'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, EmptyState } from '@/components/ui/DataDisplay';
import SimpleModal from '@/components/modals/SimpleModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiClient } from '@/lib/api';
import { Branch } from '@/types';

type BranchForm = {
  name: string;
  code: string;
  receipt_subtitle: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  latitude: string;
  longitude: string;
  geofence_km: string;
  is_active: boolean;
};

const emptyForm = (): BranchForm => ({
  name: '',
  code: '',
  receipt_subtitle: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  latitude: '',
  longitude: '',
  geofence_km: '0.1',
  is_active: true,
});

function toForm(branch: Branch): BranchForm {
  return {
    name: branch.name,
    code: branch.code,
    receipt_subtitle: branch.receipt_subtitle,
    address: branch.address,
    phone: branch.phone,
    email: branch.email,
    website: branch.website,
    latitude: String(branch.latitude ?? ''),
    longitude: String(branch.longitude ?? ''),
    geofence_km: String(branch.geofence_km ?? 0.1),
    is_active: branch.is_active,
  };
}

export default function BranchesPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { success, error } = useToast();
  const isAdmin = user?.role === 'admin';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BranchForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAdmin, isAuthenticated, router]);

  const load = async () => {
    try {
      setLoading(true);
      setBranches(await apiClient.getBranches());
    } catch (err) {
      console.error(err);
      error('Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setCreating(true);
  };

  const openEdit = (branch: Branch) => {
    setCreating(false);
    setEditing(branch);
    setForm(toForm(branch));
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    const payload = {
      name: form.name,
      code: form.code,
      receipt_subtitle: form.receipt_subtitle,
      address: form.address,
      phone: form.phone,
      email: form.email,
      website: form.website,
      latitude: Number(form.latitude) || 0,
      longitude: Number(form.longitude) || 0,
      geofence_km: Number(form.geofence_km) || 0.1,
      is_active: form.is_active,
    };
    try {
      setSaving(true);
      if (editing) {
        await apiClient.updateBranch(editing.id, payload);
        success('Shop updated');
      } else {
        await apiClient.createBranch(payload);
        success('Shop created');
      }
      closeModal();
      await load();
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      error('Save failed', message || 'Could not save this shop');
    } finally {
      setSaving(false);
    }
  };

  const modalOpen = creating || !!editing;

  return (
    <DashboardLayout>
      <PageShell
        title="Branches"
        subtitle="Physical shops, receipt text, and geofence"
        action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add shop</Button>}
      >
        {loading ? (
          <div className="text-slate-500">Loading…</div>
        ) : branches.length === 0 ? (
          <EmptyState
            icon={<MapPin className="h-10 w-10" />}
            title="No shops yet"
            description="Add Jimbaran or Nusa Dua as a physical shop."
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add shop</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {branches.map((branch) => (
              <Card key={branch.id}>
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{branch.name}</h3>
                      <p className="text-sm text-slate-500">{branch.receipt_subtitle}</p>
                    </div>
                    <Badge variant={branch.is_active ? 'success' : 'default'}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{branch.address}</p>
                  <p className="text-xs text-slate-500">
                    GPS {branch.latitude}, {branch.longitude} · {branch.geofence_km} km
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(branch)}>Edit</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageShell>

      <SimpleModal
        isOpen={modalOpen}
        title={editing ? 'Edit shop' : 'Add shop'}
        onClose={closeModal}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <div className="md:col-span-2">
            <Input label="Receipt subtitle" value={form.receipt_subtitle} onChange={(e) => setForm({ ...form, receipt_subtitle: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          <Input label="Geofence (km)" value={form.geofence_km} onChange={(e) => setForm({ ...form, geofence_km: e.target.value })} />
          <Input label="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          <Input label="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Active
          </label>
        </div>
      </SimpleModal>
    </DashboardLayout>
  );
}
