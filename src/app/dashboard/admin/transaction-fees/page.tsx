'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus } from 'lucide-react';

import { PageShell } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatFeeRate, ruleFee } from '@/lib/transaction-fee';
import { invalidateTransactionFeeRules } from '@/hooks/useTransactionFeeRules';
import type { FeeMethod, TransactionFeeRule, TransactionFeeRuleInput } from '@/types';

const METHOD_LABEL: Record<FeeMethod, string> = { qris: 'QRIS', debit: 'Debit', cc: 'Credit card' };

// The form edits the rate as a percentage; the backend stores basis points.
type Draft = Omit<TransactionFeeRuleInput, 'rate_bps'> & { rate: string };

function toDraft(rule: TransactionFeeRule): Draft {
  return {
    method: rule.method,
    terminal: rule.terminal,
    label: rule.label,
    rate: String(rule.rate_bps / 100),
    min_amount: rule.min_amount,
    active: rule.active,
    sort_order: rule.sort_order,
  };
}

function toInput(draft: Draft): TransactionFeeRuleInput {
  const { rate, ...rest } = draft;
  return { ...rest, rate_bps: Math.round((parseFloat(rate) || 0) * 100) };
}

const EMPTY_DRAFT: Draft = { method: 'cc', terminal: 'bni', label: '', rate: '', min_amount: 0, active: false, sort_order: 50 };

function errorMessage(e: unknown, fallback: string) {
  const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || fallback;
}

export default function TransactionFeesPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [rules, setRules] = useState<TransactionFeeRule[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await apiClient.getTransactionFeeRules(true);
      setRules(rows);
      setDrafts(Object.fromEntries(rows.map((r) => [r.id, toDraft(r)])));
    } catch (e: unknown) {
      toastError('Could not load fee rules', errorMessage(e, 'Load failed'));
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const setDraft = (id: string, change: Partial<Draft>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...change } }));

  async function saveRule(id: string) {
    setSaving(id);
    try {
      await apiClient.updateTransactionFeeRule(id, toInput(drafts[id]));
      invalidateTransactionFeeRules();
      success('Fee rule saved', drafts[id].label);
      await load();
    } catch (e: unknown) {
      toastError('Could not save the rule', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(null);
    }
  }

  async function addRule() {
    setSaving('new');
    try {
      await apiClient.createTransactionFeeRule(toInput(newDraft));
      invalidateTransactionFeeRules();
      success('Fee rule added', newDraft.label);
      setNewDraft(EMPTY_DRAFT);
      await load();
    } catch (e: unknown) {
      toastError('Could not add the rule', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(null);
    }
  }

  if (authLoading || (isAdmin && loading)) {
    return <div className="py-24 text-center text-slate-500">Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <PageShell title="Transaction Fees" subtitle="Admin only">
        <Card>
          <CardContent>
            <div className="font-semibold text-slate-900">Access denied</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // Two active rules for one method make Staff pick the terminal at the counter.
  const activeCount = (method: FeeMethod) => rules.filter((r) => r.active && r.method === method).length;

  return (
    <PageShell
      title="Transaction Fees"
      subtitle="The fee the customer pays on top of QRIS and card payments. Enter the MDR from each bank's merchant agreement."
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Bank Indonesia (PBI 23/6/2021, Art. 52) does not allow a merchant to charge its MDR to the buyer, and
            the BCA and BNI merchant agreements may forbid a surcharge too. Check both before you turn a card rule on.
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle size="lg">Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rules.map((rule) => {
                const draft = drafts[rule.id];
                if (!draft) return null;
                const dirty = JSON.stringify(toInput(draft)) !== JSON.stringify(toInput(toDraft(rule)));
                const example = ruleFee({ ...rule, ...toInput(draft) }, 1_000_000);
                return (
                  <div key={rule.id} className="grid gap-3 rounded-xl px-3 py-3 ring-1 ring-black/5 md:grid-cols-12 md:items-end" data-testid="fee-rule-row">
                    <div className="md:col-span-4">
                      <Input id={`fee-label-${rule.id}`} label="Label" value={draft.label} onChange={(e) => setDraft(rule.id, { label: e.target.value })} />
                    </div>
                    <div className="md:col-span-2 text-sm">
                      <div className="text-xs font-medium text-slate-500">Method · terminal</div>
                      <div className="mt-2 text-slate-900">
                        {METHOD_LABEL[rule.method]}
                        {rule.terminal ? ` · ${rule.terminal.toUpperCase()}` : ''}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        id={`fee-rate-${rule.id}`}
                        label="Rate (%)"
                        inputMode="decimal"
                        value={draft.rate}
                        onChange={(e) => setDraft(rule.id, { rate: e.target.value })}
                        helperText={`Rp 1.000.000 → ${formatCurrency(example)}`}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Input
                        id={`fee-min-${rule.id}`}
                        label="Only above (Rp)"
                        inputMode="numeric"
                        value={String(draft.min_amount)}
                        onChange={(e) => setDraft(rule.id, { min_amount: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 md:col-span-2 md:justify-end">
                      <Switch checked={draft.active} onChange={(active) => setDraft(rule.id, { active })} label="Active" />
                      <Button size="sm" disabled={!dirty} loading={saving === rule.id} onClick={() => void saveRule(rule.id)}>
                        Save
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Active now: QRIS {activeCount('qris')}, debit {activeCount('debit')}, credit card {activeCount('cc')}. When
              a method has two or more active rules, Staff picks the EDC terminal and card on each payment. Changing a
              rate does not change fees already charged.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle size="lg">Add a rule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-12 md:items-end">
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-slate-700">Method</span>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={newDraft.method}
                  onChange={(e) => setNewDraft((d) => ({ ...d, method: e.target.value as FeeMethod }))}
                >
                  <option value="cc">Credit card</option>
                  <option value="debit">Debit</option>
                  <option value="qris">QRIS</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-medium text-slate-700">Terminal</span>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={newDraft.terminal}
                  onChange={(e) => setNewDraft((d) => ({ ...d, terminal: e.target.value }))}
                >
                  <option value="bni">BNI</option>
                  <option value="bca">BCA</option>
                  <option value="">Any</option>
                </select>
              </label>
              <div className="md:col-span-4">
                <Input id="fee-new-label" label="Label" placeholder="BNI EDC · Credit card" value={newDraft.label} onChange={(e) => setNewDraft((d) => ({ ...d, label: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Input id="fee-new-rate" label="Rate (%)" inputMode="decimal" value={newDraft.rate} onChange={(e) => setNewDraft((d) => ({ ...d, rate: e.target.value }))} helperText={newDraft.rate ? formatFeeRate(Math.round((parseFloat(newDraft.rate) || 0) * 100)) : undefined} />
              </div>
              <div className="md:col-span-2">
                <Button className="w-full" loading={saving === 'new'} disabled={!newDraft.label.trim() || !newDraft.rate} onClick={() => void addRule()}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">A new rule starts inactive. Turn it on after you check the rate.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
