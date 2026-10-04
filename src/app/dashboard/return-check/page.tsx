'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, MessageCircle, PackageCheck, ScanLine } from 'lucide-react';
import clsx from 'clsx';

import { PageShell, StatGrid } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, EmptyState } from '@/components/ui/DataDisplay';
import { CompleteRentalModal } from '@/components/modals/CompleteRentalModal';
import { RentalInvoiceModal } from '@/components/modals/RentalInvoiceModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import apiClient from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-utils';
import { formatCurrency } from '@/lib/currency';
import { formatDate, formatDateShort, formatTime } from '@/lib/date';
import type {
  PickupReminder,
  ReminderInfo,
  Rental,
  ReturnCheck,
  ReturnCheckDay,
  ReturnCheckItem,
  ReturnCheckItemInput,
  ReturnCheckProblem,
  ReturnCheckStatus,
} from '@/types';

const STATUS_LABEL: Record<ReturnCheckStatus, string> = {
  not_started: 'Not checked',
  in_progress: 'Checking',
  checked: 'Checked',
  problem: 'Problem',
  returned: 'Returned',
};

const STATUS_VARIANT: Record<ReturnCheckStatus, 'default' | 'info' | 'success' | 'danger' | 'purple'> = {
  not_started: 'default',
  in_progress: 'info',
  checked: 'success',
  problem: 'danger',
  returned: 'purple',
};

const CHECKS: { key: 'received' | 'undamaged' | 'stain_free'; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'undamaged', label: 'No damage' },
  { key: 'stain_free', label: 'No stain' },
];

function inputFromItem(item: ReturnCheckItem): ReturnCheckItemInput {
  return {
    received: item.received,
    undamaged: item.undamaged,
    stain_free: item.stain_free,
    problem: item.problem,
    problem_note: item.problem_note,
  };
}

function recount(day: ReturnCheckDay, rentals: ReturnCheck[]): ReturnCheckDay {
  return {
    ...day,
    rentals,
    checked: rentals.filter((r) => r.status === 'checked').length,
    problem: rentals.filter((r) => r.status === 'problem').length,
  };
}

/** The damage note Complete starts with: one line per Item with a problem. */
function problemNotes(check: ReturnCheck): string {
  return check.items
    .filter((item) => item.problem)
    .map((item) => `${item.code || item.name}: ${item.problem}${item.problem_note ? ` — ${item.problem_note}` : ''}`)
    .join('\n');
}

function reminderText(reminder: ReminderInfo | undefined, remindedToday: boolean): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  if (remindedToday && reminder?.sent_at) return { text: `WhatsApp sent ${formatTime(reminder.sent_at).slice(0, 5)}`, tone: 'ok' };
  if (remindedToday) return { text: 'WhatsApp sent today', tone: 'ok' };
  if (!reminder) return { text: 'Not reminded', tone: 'warn' };
  if (reminder.status === 'failed') return { text: `Last send failed${reminder.error ? `: ${reminder.error}` : ''}`, tone: 'warn' };
  if (reminder.status === 'skipped') return { text: `Skipped${reminder.error ? `: ${reminder.error}` : ''}`, tone: 'warn' };
  return { text: `Last reminded ${formatDateShort(`${reminder.reminder_date}T00:00:00`)}`, tone: 'warn' };
}

export default function ReturnCheckPage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { success, error: toastError, warning: toastWarning } = useToast();
  const canUse = user?.role === 'admin' || user?.role === 'staff';

  const [date, setDate] = useState('');
  // False while the page follows today. A date picked by hand stays put.
  const [pinned, setPinned] = useState(false);
  const [day, setDay] = useState<ReturnCheckDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideDone, setHideDone] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scan, setScan] = useState('');
  const [completing, setCompleting] = useState<{ rental: Rental; check: ReturnCheck } | null>(null);
  const [invoiceRental, setInvoiceRental] = useState<Rental | null>(null);

  // A quiet load keeps the list on screen, so a reminder send or a Complete
  // does not flash the page.
  const load = useCallback(async (forDate: string, quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const result = await apiClient.getReturnCheckDay(forDate || undefined);
      setDay(result);
      // The first load has no date: the backend picks today in shop time.
      if (!forDate) setDate(result.date);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Failed to load the Return Check'));
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

  // Every 5 minutes: a new day moves the list to today, and 20:00 adds the
  // late day to every Rental that is not back.
  useAutoRefresh(() => void load(pinned ? date : '', true), 5 * 60_000, canUse);

  const replaceRental = useCallback((check: ReturnCheck) => {
    setDay((current) => {
      if (!current) return current;
      return recount(current, current.rentals.map((r) => (r.rental_id === check.rental_id ? check : r)));
    });
  }, []);

  const saveItem = useCallback(
    async (check: ReturnCheck, item: ReturnCheckItem, change: Partial<ReturnCheckItemInput>) => {
      const key = `${check.rental_id}:${item.item_id}`;
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        replaceRental(
          await apiClient.checkReturnItem(check.rental_id, item.item_id, {
            ...inputFromItem(item),
            problem_note: notes[key] ?? item.problem_note,
            ...change,
          }),
        );
      } catch (e: unknown) {
        toastError('Could not save the check', apiErrorMessage(e, 'Save failed'));
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [notes, replaceRental, toastError],
  );

  const sendReminder = useCallback(
    async (rentalId: string, customerName: string) => {
      const key = `${rentalId}:wa`;
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        const reminder = await apiClient.sendRentalWAReminder(rentalId);
        const kind = reminder.reminder_type === 'pickup' ? 'Pickup' : 'Return';
        success(`${kind} reminder sent`, `WhatsApp to ${customerName || reminder.phone}`);
        await load(date, true);
      } catch (e: unknown) {
        // The backend explains a cooldown or a daily cap in its message.
        toastError('Could not send WhatsApp reminder', apiErrorMessage(e, 'Check phone and Wablas.'));
        await load(date, true);
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [date, load, success, toastError],
  );

  const openComplete = useCallback(
    async (check: ReturnCheck) => {
      const key = `${check.rental_id}:complete`;
      setSaving((s) => ({ ...s, [key]: true }));
      try {
        setCompleting({ rental: await apiClient.getRental(check.rental_id), check });
      } catch (e: unknown) {
        toastError('Could not open the rental', apiErrorMessage(e, 'Please try again.'));
      } finally {
        setSaving((s) => ({ ...s, [key]: false }));
      }
    },
    [toastError],
  );

  // A scanner types the code and presses Enter. The first matching Item that is
  // not yet received gets its "Received" tick.
  const onScan = useCallback(async () => {
    const code = scan.trim().toLowerCase();
    if (!code || !day) return;
    for (const check of day.rentals) {
      if (check.status === 'returned') continue;
      const item = check.items.find(
        (i) => !i.received && (i.code.toLowerCase() === code || (i.barcode || '').toLowerCase() === code),
      );
      if (item) {
        setScan('');
        await saveItem(check, item, { received: true, problem: item.problem === 'missing' ? '' : item.problem });
        success('Received', `${item.code} from ${check.customer_name}`);
        return;
      }
    }
    toastWarning('No match', `No Item waiting for "Received" has code ${scan.trim()} on this list.`);
  }, [scan, day, saveItem, success, toastWarning]);

  const visible = useMemo(
    () => (day?.rentals || []).filter((r) => !hideDone || r.status !== 'returned'),
    [day, hideDone],
  );
  const pickups = useMemo(
    () => (day?.pickups || []).filter((p) => !hideDone || !p.reminded_today),
    [day, hideDone],
  );
  const showBranch = new Set(day?.rentals.map((r) => r.branch_id)).size > 1;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !canUse) {
    return (
      <PageShell title="Return Check" subtitle="Staff and Admin only">
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
      title="Return Check"
      subtitle="Every day: remind today's Pickups and Returns on WhatsApp, check each returned Item, then Complete."
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-48">
            <Input
              type="date"
              label="Return date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPinned(Boolean(e.target.value));
                if (e.target.value) void load(e.target.value);
              }}
              data-testid="return-check-date"
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
                label="Scan returned Item"
                placeholder="Scan or type a code"
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                data-testid="return-check-scan"
              />
            </div>
            <Button type="submit" variant="secondary" className="self-end">
              <ScanLine className="h-4 w-4" />
              Received
            </Button>
          </form>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-slate-700 sm:ml-auto">
            <input
              type="checkbox"
              className="h-4 w-4 accent-slate-900"
              style={{ appearance: 'auto' }}
              checked={hideDone}
              onChange={(e) => setHideDone(e.target.checked)}
            />
            Hide done
          </label>
        </div>
      }
    >
      <div className="space-y-4">
        {day && (
          <StatGrid
            stats={[
              { label: 'Returns', value: day.total },
              { label: 'To remind', value: day.to_remind },
              { label: 'Checked', value: day.checked },
              { label: 'Problem', value: day.problem },
              { label: 'Overdue', value: day.overdue },
              { label: 'Returned', value: day.returned },
            ]}
          />
        )}

        {error && (
          <div className="rounded-xl bg-red-50 ring-1 ring-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : (
          <>
            {pickups.length > 0 && (
              <Card data-testid="return-check-pickups">
                <CardContent>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-slate-900">Pickups to remind</h2>
                    <Link href="/dashboard/pickup-prep" className="text-sm text-slate-500 underline-offset-2 hover:underline">
                      Item checks are on Pickup Prep
                    </Link>
                  </div>
                  <ul className="mt-3 divide-y divide-black/5">
                    {pickups.map((pickup) => (
                      <PickupReminderRow
                        key={pickup.rental_id}
                        pickup={pickup}
                        showBranch={showBranch}
                        busy={Boolean(saving[`${pickup.rental_id}:wa`])}
                        onSend={() => void sendReminder(pickup.rental_id, pickup.customer_name)}
                      />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {visible.length === 0 ? (
              <EmptyState
                icon={<PackageCheck className="h-6 w-6" />}
                title={day && day.total > 0 ? 'Every Return is done' : 'No Returns on this day'}
                description={day ? `Return date ${formatDate(`${day.date}T00:00:00`)}` : undefined}
              />
            ) : (
              visible.map((check) => (
                <ReturnChecklist
                  key={check.rental_id}
                  check={check}
                  showBranch={showBranch}
                  saving={saving}
                  notes={notes}
                  onNote={(key, value) => setNotes((n) => ({ ...n, [key]: value }))}
                  onSaveItem={saveItem}
                  onSendReminder={() => void sendReminder(check.rental_id, check.customer_name)}
                  onComplete={() => void openComplete(check)}
                />
              ))
            )}
          </>
        )}
      </div>

      <CompleteRentalModal
        isOpen={Boolean(completing)}
        rental={completing?.rental || null}
        onClose={() => setCompleting(null)}
        initialDamageNotes={completing ? problemNotes(completing.check) : ''}
        maintenanceItemIds={completing?.check.items.filter((i) => i.problem === 'damaged').map((i) => i.item_id)}
        onCompleted={(latest) => {
          setCompleting(null);
          setInvoiceRental(latest);
          success('Rental completed', latest.customer ? `${latest.customer.first_name} ${latest.customer.last_name}`.trim() : undefined);
          void load(date, true);
        }}
      />

      <RentalInvoiceModal isOpen={Boolean(invoiceRental)} onClose={() => setInvoiceRental(null)} rental={invoiceRental} />
    </PageShell>
  );
}

function ReminderLine({
  reminder,
  remindedToday,
  busy,
  onSend,
  label,
}: {
  reminder?: ReminderInfo;
  remindedToday: boolean;
  busy: boolean;
  onSend: () => void;
  label: string;
}) {
  const state = reminderText(reminder, remindedToday);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={clsx(
          'text-sm',
          state.tone === 'ok' && 'text-emerald-700',
          state.tone === 'warn' && 'font-medium text-amber-700',
          state.tone === 'muted' && 'text-slate-500',
        )}
      >
        {state.tone === 'ok' && <CheckCircle2 className="mr-1 inline h-4 w-4 align-text-bottom" />}
        {state.text}
      </span>
      <Button size="sm" variant={remindedToday ? 'ghost' : 'secondary'} loading={busy} onClick={onSend} data-testid="return-check-send-wa">
        <MessageCircle className="h-3.5 w-3.5" />
        {remindedToday ? 'Resend' : label}
      </Button>
    </div>
  );
}

function PickupReminderRow({
  pickup,
  showBranch,
  busy,
  onSend,
}: {
  pickup: PickupReminder;
  showBranch: boolean;
  busy: boolean;
  onSend: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-medium text-slate-900">{pickup.customer_name || 'Customer'}</div>
        <div className="text-sm text-slate-600">
          {[
            pickup.invoice_number,
            pickup.customer_phone,
            `${pickup.items_total} ${pickup.items_total === 1 ? 'Item' : 'Items'}`,
            pickup.remaining_amount > 0.009 ? `Collect ${formatCurrency(pickup.remaining_amount)}` : null,
            showBranch ? pickup.branch_name : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <ReminderLine
        reminder={pickup.reminder}
        remindedToday={pickup.reminded_today}
        busy={busy}
        onSend={onSend}
        label="Send pickup WA"
      />
    </li>
  );
}

function ReturnChecklist({
  check,
  showBranch,
  saving,
  notes,
  onNote,
  onSaveItem,
  onSendReminder,
  onComplete,
}: {
  check: ReturnCheck;
  showBranch: boolean;
  saving: Record<string, boolean>;
  notes: Record<string, string>;
  onNote: (key: string, value: string) => void;
  onSaveItem: (check: ReturnCheck, item: ReturnCheckItem, change: Partial<ReturnCheckItemInput>) => Promise<void>;
  onSendReminder: () => void;
  onComplete: () => void;
}) {
  const open = check.status !== 'returned';
  const hasMissing = check.items.some((i) => i.problem === 'missing');

  return (
    <Card data-testid="return-check-rental" data-status={check.status}>
      <CardContent>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{check.customer_name || 'Customer'}</span>
              <Badge variant={STATUS_VARIANT[check.status]}>{STATUS_LABEL[check.status]}</Badge>
              {check.days_overdue > 0 && (
                <Badge variant="danger" dot>
                  {check.days_overdue} {check.days_overdue === 1 ? 'day' : 'days'} late
                </Badge>
              )}
              <span className="text-xs text-slate-500">
                {check.items_passed}/{check.items_total} Items checked
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {[
                check.invoice_number,
                check.customer_phone,
                `Due ${formatDateShort(check.due_by)} by ${formatTime(check.due_by).slice(0, 5)}`,
                check.actual_return_date ? `Back ${formatDateShort(check.actual_return_date)}` : null,
                showBranch ? check.branch_name : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
            {check.notes && <div className="mt-1 text-xs text-slate-500">Note: {check.notes}</div>}
          </div>
          {open && (
            <ReminderLine
              reminder={check.reminder}
              remindedToday={check.reminded_today}
              busy={Boolean(saving[`${check.rental_id}:wa`])}
              onSend={onSendReminder}
              label="Send return WA"
            />
          )}
        </div>

        <ul className="mt-4 divide-y divide-black/5">
          {check.items.map((item) => {
            const key = `${check.rental_id}:${item.item_id}`;
            const busy = Boolean(saving[key]) || !open;
            const note = notes[key] ?? item.problem_note;
            return (
              <li key={item.item_id} className={clsx('py-3', item.problem && 'rounded-xl bg-red-50/60 px-3')}>
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-slate-900">{item.code || '—'}</span>
                      {item.is_addon && <Badge variant="purple">Add-on</Badge>}
                      {item.passed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {[item.name, item.size, item.color].filter(Boolean).join(' · ')}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {CHECKS.map((c) => (
                      <label key={c.key} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-emerald-600"
                          style={{ appearance: 'auto' }}
                          checked={item[c.key]}
                          disabled={busy}
                          onChange={(e) => void onSaveItem(check, item, { [c.key]: e.target.checked })}
                          data-testid={`return-${c.key}`}
                        />
                        {c.label}
                      </label>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || item.passed}
                      onClick={() => void onSaveItem(check, item, { received: true, undamaged: true, stain_free: true, problem: '' })}
                    >
                      All OK
                    </Button>
                    <select
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm"
                      value={item.problem}
                      disabled={busy}
                      onChange={(e) => void onSaveItem(check, item, { problem: e.target.value as ReturnCheckProblem })}
                      aria-label="Problem"
                      data-testid="return-problem"
                    >
                      <option value="">No problem</option>
                      <option value="damaged">Damaged</option>
                      <option value="missing">Missing</option>
                    </select>
                  </div>
                </div>

                {item.problem && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
                    <input
                      className="h-9 flex-1 rounded-lg border border-red-200 bg-white px-3 text-sm"
                      placeholder={item.problem === 'missing' ? 'What is missing? What did the customer say?' : 'What is the damage? Where?'}
                      value={note}
                      disabled={!open}
                      onChange={(e) => onNote(key, e.target.value)}
                      onBlur={() => {
                        if (note !== item.problem_note) void onSaveItem(check, item, { problem_note: note });
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {check.security_deposit > 0 && (
              <div className={check.deposit_held && !open ? 'font-medium text-amber-700' : 'text-slate-600'}>
                {check.deposit_held
                  ? `Deposit ${formatCurrency(check.security_deposit)} held${open ? '' : ' — release it after the Item check'}`
                  : `Deposit ${formatCurrency(check.security_deposit)} settled`}
              </div>
            )}
            {open && hasMissing && (
              <div className="font-medium text-red-700">Record the missing Item under Lost items before Complete.</div>
            )}
            {open && check.days_overdue > 0 && (
              <div className="font-medium text-amber-700">
                Late Fee now {formatCurrency(check.late_fee)}: {check.days_overdue} × 50% of the booking. Another 50% at 20:00.
              </div>
            )}
            {!open && check.late_fee > 0 && (
              <div className="text-slate-600">Late Fee charged {formatCurrency(check.late_fee)}</div>
            )}
          </div>
          {open ? (
            <Button
              size="sm"
              variant={check.status === 'checked' ? 'primary' : 'secondary'}
              loading={Boolean(saving[`${check.rental_id}:complete`])}
              onClick={onComplete}
              data-testid="return-check-complete"
            >
              Complete return
            </Button>
          ) : check.deposit_held ? (
            <Link href="/dashboard/rentals?deposit=awaiting_check">
              <Button size="sm" variant="secondary">Release deposit</Button>
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
