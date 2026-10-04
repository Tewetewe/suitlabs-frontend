'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarCheck, ChevronDown, ChevronRight } from 'lucide-react';

import { PageShell, StatGrid } from '@/components/ui/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Badge, EmptyState } from '@/components/ui/DataDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { useToast } from '@/contexts/ToastContext';
import apiClient from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { BANK_POTS, potLabel } from '@/lib/pots';
import type { DailyClose, DailyCloseRental, DailyCloseSummary, TipMonth } from '@/types';

type Tips = { tips_cash: number; tips_bca: number; tips_bni: number };

const NO_TIPS: Tips = { tips_cash: 0, tips_bca: 0, tips_bni: 0 };

function tipsOf(close?: DailyClose): Tips {
  if (!close) return NO_TIPS;
  return { tips_cash: close.tips_cash, tips_bca: close.tips_bca, tips_bni: close.tips_bni };
}

function monthName(month: string) {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

function errorMessage(e: unknown, fallback: string) {
  const value = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  return value?.response?.data?.error || value?.response?.data?.message || value?.message || fallback;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function daysAgo(n: number) {
  const day = new Date();
  day.setDate(day.getDate() - n);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
}

const SOURCE_LABELS: Record<string, string> = {
  booking: 'Bookings',
  rental: 'Rentals (late fees, damage)',
  sale: 'Sales',
  deposit: 'Security Deposits',
  refund: 'Refunds',
  expense: 'Expenses',
  pot_transfer: 'Pot Transfers',
  payable: 'Payables',
  loan: 'Loans',
  dividend: 'Dividends',
  item: 'Item purchases',
  fixed_asset: 'Fixed Asset purchases',
  opening: 'Opening Balance',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  transfer: 'Transfer',
  qris: 'QRIS',
  debit: 'Debit card',
  cc: 'Credit card',
};

function sourceLabel(source: string) {
  return SOURCE_LABELS[source] || source;
}

function signedCurrency(value: number) {
  if (Math.round(value) === 0) return formatCurrency(0);
  return `${value > 0 ? '+' : '−'}${formatCurrency(Math.abs(value))}`;
}

function differenceText(value: number) {
  if (Math.round(value) === 0) return 'Matches';
  return value > 0 ? `Over ${formatCurrency(value)}` : `Short ${formatCurrency(-value)}`;
}

function differenceClass(value: number) {
  if (Math.round(value) === 0) return 'text-emerald-700';
  return value > 0 ? 'text-amber-700' : 'text-red-700';
}

function RentalList({ rows, dateLabel }: { rows: DailyCloseRental[]; dateLabel: string }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, 5);
  return (
    <div>
      <ul className="divide-y divide-black/5 text-sm">
        {shown.map((row) => (
          <li key={row.rental_id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900">{row.customer_name || 'No name'}</div>
              <div className="text-xs text-slate-500">
                {row.invoice_number || row.rental_id.slice(0, 8)} · {dateLabel} {row.date.slice(0, 10)}
              </div>
            </div>
            <Badge variant={row.status === 'overdue' ? 'danger' : 'warning'}>{row.status}</Badge>
          </li>
        ))}
      </ul>
      {rows.length > 5 && (
        <button type="button" className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900" onClick={() => setOpen((v) => !v)}>
          {open ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

export default function DailyClosePage() {
  const router = useRouter();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { currentBranch, viewingAll, branches } = useBranch();
  const { success, error: toastError } = useToast();
  const isAdmin = user?.role === 'admin';

  const [date, setDate] = useState(today());
  const [summary, setSummary] = useState<DailyCloseSummary | null>(null);
  const [history, setHistory] = useState<DailyClose[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counted, setCounted] = useState(0);
  const [startCash, setStartCash] = useState(0);
  const [note, setNote] = useState('');
  const [tips, setTips] = useState<Tips>(NO_TIPS);
  const [deposit, setDeposit] = useState({ to_pot: 'bca', amount: 0, note: '' });
  const [showLines, setShowLines] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, day] = await Promise.all([
        apiClient.getDailyCloses(daysAgo(30), today()),
        viewingAll ? Promise.resolve(null) : apiClient.getDailyClose(date),
      ]);
      setHistory(rows);
      setSummary(day);
      if (day) {
        setCounted(day.close?.counted_cash ?? 0);
        setStartCash(day.start_cash);
        setNote(day.close?.note ?? '');
        setTips(tipsOf(day.close));
      }
    } catch (e: unknown) {
      toastError('Could not load the daily close', errorMessage(e, 'Load failed'));
    } finally {
      setLoading(false);
    }
  }, [date, viewingAll, toastError]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) void load();
    // The header shop is part of every request, so a shop change reloads.
  }, [isAdmin, load, currentBranch?.id]);

  const cashPot = summary?.pots.find((pot) => pot.pot === 'cash');
  const firstClose = summary?.start_cash_from !== 'last_close';
  const expected = summary ? (firstClose ? startCash : summary.start_cash) + (cashPot?.net ?? 0) : 0;
  const difference = counted - expected;
  const needsNote = Math.round(difference) !== 0 && note.trim() === '';
  const tipsToday = tips.tips_cash + tips.tips_bca + tips.tips_bni;
  const branchName = useCallback((id: string) => branches.find((b) => b.id === id)?.name || 'Shop', [branches]);

  const bankPots = useMemo(() => (summary?.pots || []).filter((pot) => pot.pot !== 'cash' && (pot.in || pot.out || pot.pot !== 'bank')), [summary]);

  async function submitDeposit() {
    if (!summary) return;
    setSaving(true);
    try {
      await apiClient.createPotTransfer({
        transfer_date: summary.date,
        from_pot: 'cash',
        to_pot: deposit.to_pot,
        amount: deposit.amount,
        note: deposit.note || 'End-of-day cash deposit',
      });
      success('Deposit recorded', `${formatCurrency(deposit.amount)} Cash Drawer → ${potLabel(deposit.to_pot)}`);
      setDeposit({ to_pot: deposit.to_pot, amount: 0, note: '' });
      await load();
    } catch (e: unknown) {
      toastError('Could not record the deposit', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function shareMonth(month: TipMonth) {
    const again = month.share ? ' again' : '';
    if (!window.confirm(`Share the ${monthName(month.month)} tips of ${currentBranch?.name || 'this shop'}${again}: ${formatCurrency(month.total)}?`)) return;
    setSaving(true);
    try {
      const shared = await apiClient.shareTips({ month: month.month });
      setSummary((s) => (s ? { ...s, tip_months: s.tip_months.map((m) => (m.month === shared.month ? shared : m)) } : s));
      success('Tips shared', `${monthName(shared.month)} · ${formatCurrency(shared.total)}`);
    } catch (e: unknown) {
      toastError('Could not share the tips', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  async function submitClose() {
    if (!summary) return;
    setSaving(true);
    try {
      const result = await apiClient.closeDay({
        date: summary.date,
        counted_cash: counted,
        start_cash: firstClose ? startCash : undefined,
        ...tips,
        note,
      });
      setSummary(result);
      success('Day closed', `${currentBranch?.name || 'Shop'} · ${result.date} · ${differenceText(result.close?.difference ?? 0)}`);
      setHistory(await apiClient.getDailyCloses(daysAgo(30), today()));
    } catch (e: unknown) {
      toastError('Could not close the day', errorMessage(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || (isAdmin && loading && !summary && history.length === 0)) {
    return <div className="py-24 text-center text-slate-500">Loading...</div>;
  }

  if (!isAuthenticated || !isAdmin) {
    return (
      <PageShell title="Daily Close" subtitle="Admin only">
        <Card>
          <CardContent>
            <div className="font-semibold text-slate-900">Access denied</div>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const historyCard = (
    <Card>
      <CardHeader>
        <CardTitle size="lg">Last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="No closed days yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  {viewingAll && <th className="py-2 pr-3 font-medium">Shop</th>}
                  <th className="py-2 pr-3 text-right font-medium">Expected</th>
                  <th className="py-2 pr-3 text-right font-medium">Counted</th>
                  <th className="py-2 pr-3 text-right font-medium">Difference</th>
                  <th className="py-2 pr-3 text-right font-medium">Tips</th>
                  <th className="py-2 pr-3 font-medium">Closed by</th>
                  <th className="py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {history.map((row) => (
                  <tr key={row.id} data-testid="close-history-row">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {viewingAll ? (
                        row.close_date.slice(0, 10)
                      ) : (
                        <button type="button" className="font-medium text-slate-900 underline-offset-2 hover:underline" onClick={() => setDate(row.close_date.slice(0, 10))}>
                          {row.close_date.slice(0, 10)}
                        </button>
                      )}
                    </td>
                    {viewingAll && <td className="py-2 pr-3">{branchName(row.branch_id)}</td>}
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(row.expected_cash)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(row.counted_cash)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums font-medium ${differenceClass(row.difference)}`}>{differenceText(row.difference)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(row.tips_cash + row.tips_bca + row.tips_bni)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{row.closed_by_name || '—'}</td>
                    <td className="py-2 text-slate-600">{row.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (viewingAll || !summary) {
    return (
      <PageShell title="Daily Close" subtitle="Count the Cash Drawer of each shop at the end of the day.">
        <div className="space-y-4">
          <Card>
            <CardContent>
              <p className="text-sm text-slate-700">
                Each shop has its own Cash Drawer, so you close one shop at a time. Pick a shop in the header to close its day.
              </p>
            </CardContent>
          </Card>
          {historyCard}
        </div>
      </PageShell>
    );
  }

  const saved = summary.close;
  const rangeText = summary.from_date === summary.date ? summary.date : `${summary.from_date} to ${summary.date}`;

  return (
    <PageShell
      title="Daily Close"
      subtitle={`${currentBranch?.name || 'Shop'} · Check the day, deposit the cash, record the tips, count the drawer. A close locks nothing.`}
      action={
        <div className="w-44">
          <Input type="date" value={date} max={today()} onChange={(e) => e.target.value && setDate(e.target.value)} data-testid="close-date" />
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {saved ? (
            <Badge variant="success" dot>
              Closed {saved.closed_by_name ? `by ${saved.closed_by_name}` : ''} at {new Date(saved.closed_at).toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="warning" dot>Not closed</Badge>
          )}
          {summary.changed_since_close && <Badge variant="danger" dot>Money changed after the close</Badge>}
          {summary.from_date !== summary.date && (
            <span className="text-slate-600">
              This close covers {rangeText}: every day since the last close on {summary.last_close?.close_date.slice(0, 10)}.
            </span>
          )}
        </div>

        {!summary.can_close && (
          <div className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            A later day is already closed for this shop. You can read this day, but you can only close the newest day again.
          </div>
        )}

        {summary.changed_since_close && saved && (
          <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            A payment, expense, or transfer of {rangeText} changed after the close. Count again and close the day again to keep the new figures.
          </div>
        )}

        {/* 1. Rentals that still need Staff */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">1. Check the day</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.open_pickups.length === 0 && summary.open_returns.length === 0 ? (
              <p className="text-sm text-emerald-700">Every Pickup of the day happened and no Rental is out past its Return date.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-semibold text-slate-900">
                    Pickups not done <span className="text-slate-500">({summary.open_pickups.length})</span>
                  </div>
                  {summary.open_pickups.length === 0 ? (
                    <p className="text-sm text-slate-500">None.</p>
                  ) : (
                    <RentalList rows={summary.open_pickups} dateLabel="pickup" />
                  )}
                </div>
                <div>
                  <div className="mb-1 text-sm font-semibold text-slate-900">
                    Still out after the Return date <span className="text-slate-500">({summary.open_returns.length})</span>
                  </div>
                  {summary.open_returns.length === 0 ? (
                    <p className="text-sm text-slate-500">None.</p>
                  ) : (
                    <RentalList rows={summary.open_returns} dateLabel="due" />
                  )}
                  <Link href="/dashboard/return-check" className="mt-2 inline-block text-xs font-medium text-slate-600 hover:text-slate-900">
                    Open Return Check →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Money by Pot */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">2. Money of {rangeText}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">Pot</th>
                    <th className="py-2 pr-3 text-right font-medium">In</th>
                    <th className="py-2 pr-3 text-right font-medium">Out</th>
                    <th className="py-2 pr-3 text-right font-medium">Net</th>
                    <th className="py-2 text-right font-medium">On the books</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {[cashPot, ...bankPots].filter(Boolean).map((pot) => (
                    <tr key={pot!.pot} data-testid={`close-pot-${pot!.pot}`}>
                      <td className="py-2 pr-3 font-medium text-slate-900">{potLabel(pot!.pot)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(pot!.in)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(pot!.out)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{signedCurrency(pot!.net)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-600">{formatCurrency(pot!.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Compare the BCA and BNI In column with the bank statement of the day. The statement also shows the tips paid on QRIS, card, or
              transfer; enter them in step 4. “On the books” is this shop’s share at the end of {summary.date}.
            </p>

            {(summary.methods.length > 0 || summary.sources.length > 0) && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">By Payment Method</div>
                  <ul className="divide-y divide-black/5 text-sm">
                    {summary.methods.map((row) => (
                      <li key={row.method} className="flex justify-between py-1.5">
                        <span>{METHOD_LABELS[row.method] || row.method}</span>
                        <span className="tabular-nums">{signedCurrency(row.in - row.out)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">By record</div>
                  <ul className="divide-y divide-black/5 text-sm">
                    {summary.sources.map((row) => (
                      <li key={row.source} className="flex justify-between py-1.5">
                        <span>{sourceLabel(row.source)}</span>
                        <span className="tabular-nums">{signedCurrency(row.in - row.out)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <button
              type="button"
              className="mt-4 flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
              onClick={() => setShowLines((v) => !v)}
              data-testid="close-lines-toggle"
            >
              {showLines ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Every payment ({summary.lines.length})
            </button>
            {showLines && (
              summary.lines.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No money moved.</p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-slate-500">
                      <tr>
                        <th className="py-2 pr-3 font-medium">Date</th>
                        <th className="py-2 pr-3 font-medium">Record</th>
                        <th className="py-2 pr-3 font-medium">Memo</th>
                        <th className="py-2 pr-3 font-medium">Pot</th>
                        <th className="py-2 pr-3 font-medium">Method</th>
                        <th className="py-2 pr-3 text-right font-medium">Amount</th>
                        <th className="py-2 font-medium">By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {summary.lines.map((line, i) => (
                        <tr key={`${line.entry_id}-${i}`}>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{line.occurred_on.slice(0, 10)}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{sourceLabel(line.source)}</td>
                          <td className="py-1.5 pr-3 text-slate-600">{line.memo}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{potLabel(line.pot)}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap">{line.method ? METHOD_LABELS[line.method] || line.method : '—'}</td>
                          <td className={`py-1.5 pr-3 text-right tabular-nums ${line.out ? 'text-red-700' : 'text-slate-900'}`}>
                            {signedCurrency(line.in - line.out)}
                          </td>
                          <td className="py-1.5 whitespace-nowrap text-slate-600">{line.created_by_name || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* 3. Cash deposit */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">3. Deposit cash to the bank (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Record the cash that leaves the drawer for the bank before you count. It is a Pot Transfer dated {summary.date}.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-12 md:items-end">
              <label className="block md:col-span-3">
                <span className="text-xs font-medium text-slate-700">To</span>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  value={deposit.to_pot}
                  onChange={(e) => setDeposit((d) => ({ ...d, to_pot: e.target.value }))}
                  data-testid="close-deposit-to"
                >
                  {BANK_POTS.map((pot) => (
                    <option key={pot.value} value={pot.value}>{potLabel(pot.value)}</option>
                  ))}
                </select>
              </label>
              <div className="md:col-span-3">
                <CurrencyInput label="Amount" value={deposit.amount} onChange={(n) => setDeposit((d) => ({ ...d, amount: n }))} />
              </div>
              <div className="md:col-span-4">
                <Input label="Note" placeholder="Deposit at BCA Kuta" value={deposit.note} onChange={(e) => setDeposit((d) => ({ ...d, note: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Button className="w-full" variant="secondary" loading={saving} disabled={deposit.amount <= 0} onClick={() => void submitDeposit()} data-testid="close-deposit-submit">
                  Record deposit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Tips */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">4. Tips for Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Tips belong to Staff, not to the shop. Count the tip bowl apart from the Cash Drawer. A tip paid on QRIS, card, or transfer lands
              in BCA or BNI on top of the bill: enter it here so the bank statement adds up. The shop shares the tips with Staff at the end of
              each month.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <CurrencyInput label="Tip bowl (cash)" value={tips.tips_cash} onChange={(n) => setTips((t) => ({ ...t, tips_cash: n }))} />
              <CurrencyInput label="Tips in BCA" value={tips.tips_bca} onChange={(n) => setTips((t) => ({ ...t, tips_bca: n }))} />
              <CurrencyInput label="Tips in BNI" value={tips.tips_bni} onChange={(n) => setTips((t) => ({ ...t, tips_bni: n }))} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Tips of this close: <b className="tabular-nums text-slate-900">{formatCurrency(tipsToday)}</b>
              {saved ? '' : ' (they count in the month when you close the day)'}
            </p>

            <ul className="mt-3 divide-y divide-black/5 rounded-lg ring-1 ring-black/5">
              {summary.tip_months
                .filter((month) => month.month === summary.date.slice(0, 7) || month.total > 0 || month.share)
                .map((month) => {
                  const current = month.month === summary.date.slice(0, 7);
                  const due = month.can_share && (!month.share || month.changed_since_share) && month.total > 0;
                  return (
                    <li key={month.month} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between" data-testid={`tip-month-${month.month}`}>
                      <div className="min-w-0 text-sm">
                        <div className="font-medium text-slate-900">
                          Tips of {monthName(month.month)}
                          {current && !month.can_share ? ' so far' : ''}:{' '}
                          <span className="tabular-nums">{formatCurrency(month.total)}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {month.share
                            ? `Shared ${formatCurrency(month.share.amount)}${month.share.shared_by_name ? ` by ${month.share.shared_by_name}` : ''} on ${new Date(month.share.shared_at).toLocaleDateString()}`
                            : month.can_share
                              ? 'Not shared yet.'
                              : 'Share them with Staff on the last day of the month.'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {month.share && !month.changed_since_share && <Badge variant="success">Shared</Badge>}
                        {month.changed_since_share && <Badge variant="danger">Changed after sharing</Badge>}
                        {!month.share && month.can_share && month.total > 0 && <Badge variant="warning">Not shared</Badge>}
                        {due && (
                          <Button size="sm" loading={saving} onClick={() => void shareMonth(month)} data-testid={`tip-share-${month.month}`}>
                            {month.share ? 'Share again' : 'Mark as shared'}
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>

        {/* 5. Count */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">5. Count the Cash Drawer</CardTitle>
          </CardHeader>
          <CardContent>
            <StatGrid
              stats={[
                {
                  label: 'Start cash',
                  value: formatCurrency(firstClose ? startCash : summary.start_cash),
                  sub: firstClose ? 'First close of this shop' : `Counted on ${summary.last_close?.close_date.slice(0, 10)}`,
                },
                { label: 'Cash in', value: formatCurrency(cashPot?.in ?? 0) },
                { label: 'Cash out', value: formatCurrency(cashPot?.out ?? 0) },
                { label: 'Expected in the drawer', value: formatCurrency(expected) },
              ]}
            />

            {firstClose && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 ring-1 ring-black/5">
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  <CurrencyInput
                    label={`Cash in the drawer at the start of ${summary.from_date}`}
                    value={startCash}
                    onChange={setStartCash}
                  />
                  <p className="text-xs text-slate-600 md:col-span-2">
                    This is the first close of this shop.
                    {summary.start_cash_from === 'books' && ` The books say ${formatCurrency(summary.start_cash)}, but they can include old history.`}
                    {' '}Type the cash that was in the drawer that morning. Every next close starts from the cash you count today.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-3">
                <CurrencyInput label="Counted cash" value={counted} onChange={setCounted} />
              </div>
              <div className="md:col-span-3">
                <div className="text-xs font-medium text-slate-700">Difference</div>
                <div className={`mt-1 flex h-10 items-center text-lg font-semibold tabular-nums ${differenceClass(difference)}`} data-testid="close-difference">
                  {differenceText(difference)}
                </div>
              </div>
              <div className="md:col-span-4">
                <Input
                  label={Math.round(difference) !== 0 ? 'Note (why the cash differs)' : 'Note'}
                  placeholder={Math.round(difference) !== 0 ? 'Change given wrong on INV-…' : 'Optional'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  className="w-full"
                  loading={saving}
                  disabled={!summary.can_close || needsNote}
                  onClick={() => void submitClose()}
                  data-testid="close-submit"
                >
                  {saved ? 'Close again' : 'Close the day'}
                </Button>
              </div>
            </div>
            {needsNote && <p className="mt-2 text-xs text-amber-700">Write why the cash differs before you close.</p>}
            <p className="mt-2 text-xs text-slate-500">
              Count the drawer without the tip bowl. The close keeps the count, the difference, and the tips. It posts nothing to the books and locks nothing: Staff can still fix a payment of this day.
            </p>
          </CardContent>
        </Card>

        {historyCard}
      </div>
    </PageShell>
  );
}
