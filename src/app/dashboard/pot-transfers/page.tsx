'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Landmark } from 'lucide-react';

import { PageShell, StatGrid } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Badge, EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { potLabel } from '@/lib/pots';
import type { Pot, PotBalances, PotTransfer } from '@/types';

function errorMessage(e: unknown, fallback: string) {
  const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || fallback;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function monthStart() {
  return `${today().slice(0, 8)}01`;
}

const POT_CHOICES: Pot[] = ['cash', 'bca', 'bni'];

export default function PotTransfersPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const isAdmin = user?.role === 'admin';
  const canUse = isAdmin || user?.role === 'staff';

  const [balances, setBalances] = useState<PotBalances | null>(null);
  const [transfers, setTransfers] = useState<PotTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ transfer_date: today(), from_pot: 'cash', to_pot: 'bca', amount: 0, note: '' });
  const [split, setSplit] = useState({ as_of_date: today(), bca_amount: 0, bni_amount: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, pots] = await Promise.all([
        apiClient.getPotTransfers(monthStart(), today()),
        isAdmin ? apiClient.getPotBalances() : Promise.resolve(null),
      ]);
      setTransfers(rows);
      setBalances(pots);
    } catch (e: unknown) {
      toastError('Could not load pot transfers', errorMessage(e, 'Load failed'));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toastError]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!canUse) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, canUse, router]);

  useEffect(() => {
    if (canUse) void load();
  }, [canUse, load]);

  async function submitTransfer() {
    setSaving(true);
    try {
      await apiClient.createPotTransfer(form);
      success('Transfer recorded', `${formatCurrency(form.amount)} ${potLabel(form.from_pot)} → ${potLabel(form.to_pot)}`);
      setForm((f) => ({ ...f, amount: 0, note: '' }));
      await load();
    } catch (e: unknown) {
      toastError('Could not record the transfer', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function submitSplit() {
    setSaving(true);
    try {
      await apiClient.splitBankBalance(split);
      success('Bank balance split', `BCA ${formatCurrency(split.bca_amount)} · BNI ${formatCurrency(split.bni_amount)}`);
      setSplit({ as_of_date: today(), bca_amount: 0, bni_amount: 0 });
      await load();
    } catch (e: unknown) {
      toastError('Could not split the balance', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function voidTransfer(row: PotTransfer) {
    if (!window.confirm(`Void ${formatCurrency(row.amount)} ${potLabel(row.from_pot)} → ${potLabel(row.to_pot)}?`)) return;
    try {
      await apiClient.voidPotTransfer(row.id);
      success('Transfer voided', 'The money is back where it was.');
      await load();
    } catch (e: unknown) {
      toastError('Could not void the transfer', errorMessage(e, 'Void failed'));
    }
  }

  if (authLoading || (canUse && loading && transfers.length === 0 && !balances)) {
    return <div className="py-24 text-center text-slate-500">Loading...</div>;
  }

  if (!isAuthenticated || !canUse) {
    return (
      <PageShell title="Pot Transfers" subtitle="Staff and Admin only">
        <Card>
          <CardContent>
            <div className="font-semibold text-slate-900">Access denied</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const fromChoices: Pot[] = isAdmin ? [...POT_CHOICES, 'bank'] : POT_CHOICES;
  const bankToBank = form.from_pot !== 'cash' && form.to_pot !== 'cash';
  const splitLeft = balances ? balances.unassigned - split.bca_amount - split.bni_amount : 0;

  return (
    <PageShell
      title="Pot Transfers"
      subtitle="Move money between the Cash Drawer, BCA, and BNI. A transfer is not income or spending."
    >
      <div className="space-y-4">
        {isAdmin && balances && (
          <StatGrid
            stats={[
              { label: 'Cash Drawer', value: formatCurrency(balances.cash) },
              { label: 'Bank BCA', value: formatCurrency(balances.bca) },
              { label: 'Bank BNI', value: formatCurrency(balances.bni) },
              { label: 'Bank (unassigned)', value: formatCurrency(balances.unassigned) },
            ]}
          />
        )}

        {isAdmin && balances && Math.abs(balances.unassigned) > 0.009 && (
          <Card>
            <CardHeader>
              <CardTitle size="lg">Split the old Bank balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Before the split, all bank money was one Bank account. Type the BCA and BNI balances from each bank
                statement on the same date. Anything the statements do not cover stays in Bank (unassigned), so a
                gap shows up instead of hiding.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-4 md:items-end">
                <Input label="Statement date" type="date" value={split.as_of_date} onChange={(e) => setSplit((s) => ({ ...s, as_of_date: e.target.value }))} />
                <CurrencyInput label="BCA balance" value={split.bca_amount} onChange={(n) => setSplit((s) => ({ ...s, bca_amount: n }))} />
                <CurrencyInput label="BNI balance" value={split.bni_amount} onChange={(n) => setSplit((s) => ({ ...s, bni_amount: n }))} />
                <Button loading={saving} disabled={split.bca_amount + split.bni_amount <= 0} onClick={() => void submitSplit()} data-testid="split-bank">
                  Split
                </Button>
              </div>
              <p className={`mt-2 text-xs ${Math.abs(splitLeft) > 0.009 ? 'text-amber-700' : 'text-emerald-700'}`}>
                Left in Bank (unassigned) after the split: {formatCurrency(splitLeft)}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle size="lg">Record a transfer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-2">
                <Input label="Date" type="date" value={form.transfer_date} onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))} />
              </div>
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-slate-700">From</span>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={form.from_pot}
                  onChange={(e) => setForm((f) => ({ ...f, from_pot: e.target.value }))}
                  data-testid="transfer-from"
                >
                  {fromChoices.map((pot) => (
                    <option key={pot} value={pot}>{potLabel(pot)}</option>
                  ))}
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-slate-700">To</span>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={form.to_pot}
                  onChange={(e) => setForm((f) => ({ ...f, to_pot: e.target.value }))}
                  data-testid="transfer-to"
                >
                  {POT_CHOICES.filter((pot) => pot !== form.from_pot).map((pot) => (
                    <option key={pot} value={pot}>{potLabel(pot)}</option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-2">
                <CurrencyInput label="Amount" value={form.amount} onChange={(n) => setForm((f) => ({ ...f, amount: n }))} />
              </div>
              <div className="md:col-span-2">
                <Input label="Note" placeholder="Deposit at BCA Kuta" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button
                  className="w-full"
                  loading={saving}
                  disabled={form.amount <= 0 || form.from_pot === form.to_pot || (!isAdmin && bankToBank)}
                  onClick={() => void submitTransfer()}
                  data-testid="transfer-submit"
                >
                  Record
                </Button>
              </div>
            </div>
            {!isAdmin && bankToBank && (
              <p className="mt-2 text-xs text-amber-700">Only Admin moves money between BCA and BNI.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle size="lg">This month</CardTitle>
          </CardHeader>
          <CardContent>
            {transfers.length === 0 ? (
              <EmptyState icon={<Landmark className="h-6 w-6" />} title="No transfers this month" />
            ) : (
              <ul className="divide-y divide-black/5">
                {transfers.map((row) => (
                  <li key={row.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between" data-testid="transfer-row">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                        <span>{potLabel(row.from_pot)}</span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <span>{potLabel(row.to_pot)}</span>
                        {row.voided_at && <Badge variant="danger">Voided</Badge>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.transfer_date.slice(0, 10)}
                        {row.note ? ` · ${row.note}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`tabular-nums font-semibold ${row.voided_at ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {formatCurrency(row.amount)}
                      </span>
                      {isAdmin && !row.voided_at && (
                        <Button size="sm" variant="ghost" onClick={() => void voidTransfer(row)}>
                          Void
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
