'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ScanLine, Send } from 'lucide-react';
import clsx from 'clsx';

import { PageShell, StatGrid } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import apiClient from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import type { PickupPrep, PickupPrepDay, PickupPrepItem, PickupPrepItemCheck, PickupPrepProblem, PickupPrepStatus } from '@/types';

const STATUS_LABEL: Record<PickupPrepStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  ready: 'Ready',
  problem: 'Problem',
};

const STATUS_VARIANT: Record<PickupPrepStatus, 'default' | 'info' | 'success' | 'danger'> = {
  not_started: 'default',
  in_progress: 'info',
  ready: 'success',
  problem: 'danger',
};

const CHECKS: { key: 'found' | 'clean' | 'undamaged' | 'size_ok'; label: string }[] = [
  { key: 'found', label: 'Found on rack' },
  { key: 'clean', label: 'Clean & steamed' },
  { key: 'undamaged', label: 'No damage' },
  { key: 'size_ok', label: 'Size matches' },
];

function errorMessage(e: unknown, fallback: string) {
  const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || fallback;
}

function checkFromItem(item: PickupPrepItem): PickupPrepItemCheck {
  return {
    found: item.found,
    clean: item.clean,
    undamaged: item.undamaged,
    size_ok: item.size_ok,
    problem: item.problem,
    problem_note: item.problem_note,
  };
}

function recount(day: PickupPrepDay, rentals: PickupPrep[]): PickupPrepDay {
  return {
    ...day,
    rentals,
    total: rentals.length,
    ready: rentals.filter((r) => r.status === 'ready').length,
    problem: rentals.filter((r) => r.status === 'problem').length,
  };
}

export default function PickupPrepPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { success, error: toastError, warning: toastWarning } = useToast();
  const canUse = user?.role === 'admin' || user?.role === 'staff';

  const [date, setDate] = useState('');
  // False while the page follows tomorrow. A date picked by hand stays put.
  const [pinned, setPinned] = useState(false);
  const [day, setDay] = useState<PickupPrepDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideReady, setHideReady] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scan, setScan] = useState('');

  // A quiet load keeps the list on screen for the timed refresh.
  const load = useCallback(async (forDate: string, quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getPickupPrepDay(forDate || undefined);
      setDay(result);
      // The first load has no date: the backend picks tomorrow in shop time.
      if (!forDate) setDate(result.date);
    } catch (e: unknown) {
      setError(errorMessage(e, 'Failed to load the pickup checklist'));
      if (!quiet) setDay(null);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (!canUse) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, canUse, router]);

  useEffect(() => {
    if (!canUse) return;
    void load('');
  }, [canUse, load]);

  // Every 5 minutes: after midnight the H-1 list moves to the new tomorrow.
  useAutoRefresh(() => void load(pinned ? date : '', true), 5 * 60_000, canUse);

  const replaceRental = useCallback((prep: PickupPrep) => {
    setDay((current) => {
      if (!current) return current;
      return recount(current, current.rentals.map((r) => (r.rental_id === prep.rental_id ? prep : r)));
    });
  }, []);

  const saveItem = useCallback(
    async (rental: PickupPrep, item: PickupPrepItem, change: Partial<PickupPrepItemCheck>) => {
      const key = `${rental.rental_id}:${item.item_id}`;
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        const prep = await apiClient.checkPickupPrepItem(rental.rental_id, item.item_id, {
          ...checkFromItem(item),
          problem_note: notes[key] ?? item.problem_note,
          ...change,
        });
        replaceRental(prep);
        if (prep.warning) toastWarning('Check saved with a warning', prep.warning);
        else if (change.problem === 'damaged') success('Marked damaged', `${item.code} is now in maintenance.`);
      } catch (e: unknown) {
        toastError('Could not save the check', errorMessage(e, 'Save failed'));
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [notes, replaceRental, success, toastError, toastWarning],
  );

  const saveAddons = useCallback(
    async (rental: PickupPrep, ready: boolean) => {
      const key = `${rental.rental_id}:addons`;
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        replaceRental(await apiClient.setPickupPrepAddons(rental.rental_id, ready));
      } catch (e: unknown) {
        toastError('Could not save the add-ons check', errorMessage(e, 'Save failed'));
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [replaceRental, toastError],
  );

  const sendAgreement = useCallback(
    async (rental: PickupPrep) => {
      const key = `${rental.rental_id}:agreement`;
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        await apiClient.sendDepositAgreement(rental.rental_id);
        replaceRental(await apiClient.getPickupPrep(rental.rental_id));
        success('Agreement sent', `Deposit Agreement sent to ${rental.customer_name}.`);
      } catch (e: unknown) {
        toastError('Could not send the agreement', errorMessage(e, 'Send failed'));
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [replaceRental, success, toastError],
  );

  // A scanner types the code and presses Enter. The first matching Item that is
  // not yet found gets its "Found on rack" tick.
  const onScan = useCallback(async () => {
    const code = scan.trim().toLowerCase();
    if (!code || !day) return;
    for (const rental of day.rentals) {
      const item = rental.items.find(
        (i) => !i.found && (i.code.toLowerCase() === code || (i.barcode || '').toLowerCase() === code),
      );
      if (item) {
        setScan('');
        await saveItem(rental, item, { found: true, problem: item.problem === 'not_found' ? '' : item.problem });
        success('Found', `${item.code} for ${rental.customer_name}`);
        return;
      }
    }
    toastWarning('No match', `No Item waiting for "Found" has code ${scan.trim()} on this day.`);
  }, [scan, day, saveItem, success, toastWarning]);

  const visible = useMemo(
    () => (day?.rentals || []).filter((r) => !hideReady || r.status !== 'ready'),
    [day, hideReady],
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !canUse) {
    return (
      <PageShell title="Pickup Prep" subtitle="Staff and Admin only">
        <Card>
          <CardContent>
            <div className="font-semibold text-slate-900">Access denied</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Pickup Prep (H-1)"
      subtitle="Check every Item for the next day's Pickups: found, clean, no damage, size matches."
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
            <Input
              type="date"
              label="Pickup date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPinned(Boolean(e.target.value));
                if (e.target.value) void load(e.target.value);
              }}
              data-testid="pickup-prep-date"
            />
          </div>
          <form
            className="flex w-full gap-2 sm:max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              void onScan();
            }}
          >
            <div className="flex-1">
              <Input
                label="Scan Item code"
                placeholder="Scan or type a code"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                data-testid="pickup-prep-scan"
              />
            </div>
            <Button type="submit" variant="secondary" className="self-end">
              <ScanLine className="h-4 w-4" />
              Found
            </Button>
          </form>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700 sm:ml-auto">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-900"
              style={{ appearance: 'auto' }}
              checked={hideReady}
              onChange={(e) => setHideReady(e.target.checked)}
            />
            Hide ready
          </label>
        </div>
      }
    >
      <div className="space-y-4">
        {day && (
          <StatGrid
            stats={[
              { label: 'Pickups', value: day.total },
              { label: 'Ready', value: day.ready },
              { label: 'Problem', value: day.problem },
              { label: 'To do', value: day.total - day.ready - day.problem },
            ]}
          />
        )}

        {error && (
          <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title={day && day.total > 0 ? 'Every Pickup is ready' : 'No Pickups on this day'}
            description={day ? `Pickup date ${formatDate(`${day.date}T00:00:00`)}` : undefined}
          />
        ) : (
          visible.map((rental) => (
            <RentalChecklist
              key={rental.rental_id}
              rental={rental}
              showBranch={new Set(day?.rentals.map((r) => r.branch_id)).size > 1}
              saving={saving}
              notes={notes}
              onNote={(key, value) => setNotes((n) => ({ ...n, [key]: value }))}
              onSaveItem={saveItem}
              onSaveAddons={saveAddons}
              onSendAgreement={sendAgreement}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}

function RentalChecklist({
  rental,
  showBranch,
  saving,
  notes,
  onNote,
  onSaveItem,
  onSaveAddons,
  onSendAgreement,
}: {
  rental: PickupPrep;
  showBranch: boolean;
  saving: Record<string, boolean>;
  notes: Record<string, string>;
  onNote: (key: string, value: string) => void;
  onSaveItem: (rental: PickupPrep, item: PickupPrepItem, change: Partial<PickupPrepItemCheck>) => Promise<void>;
  onSaveAddons: (rental: PickupPrep, ready: boolean) => Promise<void>;
  onSendAgreement: (rental: PickupPrep) => Promise<void>;
}) {
  const agreementAccepted = Boolean(rental.agreement_accepted_at);

  return (
    <Card data-testid="pickup-prep-rental">
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{rental.customer_name || 'Customer'}</span>
              <Badge variant={STATUS_VARIANT[rental.status]}>{STATUS_LABEL[rental.status]}</Badge>
              <span className="text-xs text-slate-500">
                {rental.items_passed}/{rental.items_total} Items checked
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {[rental.invoice_number, rental.customer_phone, showBranch ? rental.branch_name : null]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {rental.notes && <div className="mt-1 text-xs text-slate-500">Note: {rental.notes}</div>}
          </div>
        </div>

        <ul className="mt-4 divide-y divide-black/5">
          {rental.items.map((item) => {
            const key = `${rental.rental_id}:${item.item_id}`;
            const busy = Boolean(saving[key]);
            const note = notes[key] ?? item.problem_note;
            return (
              <li key={item.item_id} className={clsx('py-3', item.problem && 'rounded-xl bg-red-50/60 px-3')}>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">{item.code || '—'}</span>
                      {item.is_addon && <Badge variant="purple">Add-on</Badge>}
                      {item.passed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {item.item_status && item.item_status !== 'available' && (
                        <Badge variant="warning">{item.item_status}</Badge>
                      )}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[item.name, item.size, item.color].filter(Boolean).join(' · ')}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {CHECKS.map((check) => (
                      <label key={check.key} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-emerald-600"
                          style={{ appearance: 'auto' }}
                          checked={item[check.key]}
                          disabled={busy}
                          onChange={(e) => void onSaveItem(rental, item, { [check.key]: e.target.checked })}
                          data-testid={`prep-${check.key}`}
                        />
                        {check.label}
                      </label>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || item.passed}
                      onClick={() =>
                        void onSaveItem(rental, item, { found: true, clean: true, undamaged: true, size_ok: true, problem: '' })
                      }
                    >
                      All OK
                    </Button>
                    <select
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                      value={item.problem}
                      disabled={busy}
                      onChange={(e) => void onSaveItem(rental, item, { problem: e.target.value as PickupPrepProblem })}
                      aria-label="Problem"
                      data-testid="prep-problem"
                    >
                      <option value="">No problem</option>
                      <option value="damaged">Damaged → maintenance</option>
                      <option value="not_found">Not found</option>
                    </select>
                  </div>
                </div>

                {item.problem && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    <input
                      className="h-9 flex-1 rounded-lg border border-red-200 bg-white px-3 text-sm"
                      placeholder="What is wrong? Which Item replaces it?"
                      value={note}
                      onChange={(e) => onNote(key, e.target.value)}
                      onBlur={() => {
                        if (note !== item.problem_note) void onSaveItem(rental, item, { problem_note: note });
                      }}
                    />
                    {item.sent_to_maintenance && <Badge variant="warning">In maintenance</Badge>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm sm:grid-cols-3">
          {rental.has_addons ? (
            <label className="flex cursor-pointer items-center gap-2 text-slate-800">
              <input
                type="checkbox"
                className="h-5 w-5 accent-emerald-600"
                style={{ appearance: 'auto' }}
                checked={rental.addons_ready}
                disabled={Boolean(saving[`${rental.rental_id}:addons`])}
                onChange={(e) => void onSaveAddons(rental, e.target.checked)}
                data-testid="prep-addons"
              />
              Add-ons packed with the Suit
            </label>
          ) : (
            <div className="text-slate-500">No add-ons</div>
          )}

          <div>
            {!rental.deposit_required ? (
              <span className="text-slate-500">Deposit not required</span>
            ) : agreementAccepted ? (
              <span className="text-emerald-700">Deposit Agreement accepted</span>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-amber-700">
                  {rental.agreement_sent_at ? 'Agreement sent, not accepted' : 'Agreement not sent'}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={Boolean(saving[`${rental.rental_id}:agreement`])}
                  onClick={() => void onSendAgreement(rental)}
                >
                  <Send className="h-3.5 w-3.5" />
                  {rental.agreement_sent_at ? 'Resend' : 'Send'}
                </Button>
              </div>
            )}
          </div>

          <div className={rental.remaining_amount > 0.009 ? 'font-medium text-amber-700' : 'text-slate-500'}>
            {rental.remaining_amount > 0.009
              ? `Collect ${formatCurrency(rental.remaining_amount)} at Pickup`
              : 'Booking fully paid'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
