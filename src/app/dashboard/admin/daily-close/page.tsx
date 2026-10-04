'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarCheck, CheckCircle2, CircleDashed, XCircle } from 'lucide-react';

import { PageShell } from '@/components/ui/PageShell';
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
import type { DailyClose, DailyCloseLine, DailyClosePot, DailyCloseRental, DailyCloseSummary, TipMonth } from '@/types';

type Tips = { tips_cash: number; tips_bca: number; tips_bni: number };
type Slips = { bca: number | null; bni: number | null };
type BankPot = 'bca' | 'bni';

const NO_TIPS: Tips = { tips_cash: 0, tips_bca: 0, tips_bni: 0 };

function tipsOf(close?: DailyClose): Tips {
  if (!close) return NO_TIPS;
  return { tips_cash: close.tips_cash, tips_bca: close.tips_bca, tips_bni: close.tips_bni };
}

function slipsOf(close?: DailyClose): Slips {
  return { bca: close?.edc_bca_slip ?? null, bni: close?.edc_bni_slip ?? null };
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
  booking: 'Booking',
  rental: 'Rental (late fee, damage)',
  sale: 'Sale',
  deposit: 'Security Deposit',
  refund: 'Refund',
  expense: 'Expense',
  pot_transfer: 'Pot Transfer',
  payable: 'Payable',
  loan: 'Loan',
  dividend: 'Dividend',
  item: 'Item purchase',
  fixed_asset: 'Fixed Asset purchase',
  opening: 'Opening Balance',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  transfer: 'Transfer',
  qris: 'QRIS',
  debit: 'Debit card',
  cc: 'Credit card',
};

const EDC_METHODS = ['qris', 'debit', 'cc'];

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

/** "matches", "over Rp 5.000": the difference inside a sentence. */
function differenceWords(value: number) {
  const text = differenceText(value);
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function differenceClass(value: number) {
  if (Math.round(value) === 0) return 'text-emerald-700';
  return value > 0 ? 'text-amber-700' : 'text-red-700';
}

// Everything Admin types before the close is kept in a draft, so a reload
// loses nothing. A draft counts only while the close it was typed against is
// still the saved one; a newer close from another device wins.
type Draft = {
  basedOn: string; // closed_at of the saved close, or '' for none
  checked: string[];
  slips: Slips;
  tips: Tips;
  counted: number;
  startCash: number;
  note: string;
};

function draftKey(branchId: string, date: string) {
  return `suitlabs_daily_close_draft:${branchId}:${date}`;
}

function readDraft(day: DailyCloseSummary): Draft | null {
  try {
    const raw = localStorage.getItem(draftKey(day.branch_id, day.date));
    const draft = raw ? (JSON.parse(raw) as Draft) : null;
    return draft && draft.basedOn === (day.close?.closed_at ?? '') ? draft : null;
  } catch {
    return null;
  }
}

type CheckState = 'ok' | 'problem' | 'open';

function StateIcon({ state }: { state: CheckState }) {
  if (state === 'ok') return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  if (state === 'problem') return <XCircle className="h-5 w-5 shrink-0 text-red-600" />;
  return <CircleDashed className="h-5 w-5 shrink-0 text-amber-500" />;
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

/** The lines of one group of a Pot. With onToggle, each line has a tick. */
function LineTable({
  lines,
  showMethod,
  checked,
  onToggle,
  testId,
}: {
  lines: DailyCloseLine[];
  showMethod?: boolean;
  checked?: Set<string>;
  onToggle?: (key: string) => void;
  testId?: string;
}) {
  if (lines.length === 0) return <p className="py-2 text-sm text-slate-500">No lines.</p>;
  const multiDay = new Set(lines.map((l) => l.occurred_on.slice(0, 10))).size > 1;
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-sm" data-testid={testId}>
        <tbody className="divide-y divide-black/5">
          {lines.map((line) => {
            const ticked = checked?.has(line.key) ?? false;
            return (
              <tr key={line.key} className={ticked ? 'bg-emerald-50/60' : undefined} data-testid="close-line">
                {onToggle && (
                  <td className="w-8 py-1.5 pl-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={ticked}
                      onChange={() => onToggle(line.key)}
                      aria-label={`Found on the mutasi: ${line.memo} ${formatCurrency(line.in - line.out)}`}
                    />
                  </td>
                )}
                {multiDay && <td className="py-1.5 pr-3 whitespace-nowrap text-slate-500">{line.occurred_on.slice(5, 10)}</td>}
                <td className="py-1.5 pr-3 whitespace-nowrap">{sourceLabel(line.source)}</td>
                <td className="py-1.5 pr-3 text-slate-600">{line.memo}</td>
                {showMethod && <td className="py-1.5 pr-3 whitespace-nowrap">{line.method ? METHOD_LABELS[line.method] || line.method : '—'}</td>}
                <td className={`py-1.5 pr-3 text-right whitespace-nowrap tabular-nums ${line.out ? 'text-red-700' : 'text-slate-900'}`}>
                  {signedCurrency(line.in - line.out)}
                  {!!line.fee && (
                    <div className="text-xs text-slate-500" title={line.fee_uncertain ? 'Two or more fee rules fit this payment' : undefined}>
                      + fee {formatCurrency(line.fee)}
                      {line.fee_uncertain ? ' ?' : ''}
                    </div>
                  )}
                </td>
                <td className="py-1.5 whitespace-nowrap text-xs text-slate-500">{line.created_by_name || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SumRow({ label, value, strong, className }: { label: React.ReactNode; value: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1 text-sm ${strong ? 'border-t border-black/10 pt-2 font-semibold text-slate-900' : 'text-slate-600'} ${className || ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
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
  const [slips, setSlips] = useState<Slips>({ bca: null, bni: null });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deposit, setDeposit] = useState({ to_pot: 'bca', amount: 0, note: '' });

  const applyDay = useCallback((day: DailyCloseSummary, useDraft = true) => {
    const draft = useDraft ? readDraft(day) : null;
    const known = new Set(day.lines.map((l) => l.key));
    setSummary(day);
    setCounted(draft?.counted ?? day.close?.counted_cash ?? 0);
    setStartCash(draft?.startCash ?? day.start_cash);
    setNote(draft?.note ?? day.close?.note ?? '');
    setTips(draft?.tips ?? tipsOf(day.close));
    setSlips(draft?.slips ?? slipsOf(day.close));
    setChecked(new Set(draft ? draft.checked.filter((k) => known.has(k)) : day.lines.filter((l) => l.checked).map((l) => l.key)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, day] = await Promise.all([
        apiClient.getDailyCloses(daysAgo(30), today()),
        viewingAll ? Promise.resolve(null) : apiClient.getDailyClose(date),
      ]);
      setHistory(rows);
      if (day) applyDay(day);
      else setSummary(null);
    } catch (e: unknown) {
      toastError('Could not load the daily close', errorMessage(e, 'Load failed'));
    } finally {
      setLoading(false);
    }
  }, [date, viewingAll, toastError, applyDay]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!isAdmin) router.replace('/dashboard');
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) void load();
    // The header shop is part of every request, so a shop change reloads.
  }, [isAdmin, load, currentBranch?.id]);

  useEffect(() => {
    if (!summary) return;
    const draft: Draft = { basedOn: summary.close?.closed_at ?? '', checked: [...checked], slips, tips, counted, startCash, note };
    try {
      localStorage.setItem(draftKey(summary.branch_id, summary.date), JSON.stringify(draft));
    } catch {
      // A full or blocked storage only loses the draft.
    }
  }, [summary, checked, slips, tips, counted, startCash, note]);

  const linesOf = useCallback(
    (pot: string, group?: string) => (summary?.lines || []).filter((l) => l.pot === pot && (!group || l.group === group)),
    [summary],
  );
  const potOf = useCallback((pot: string) => summary?.pots.find((p) => p.pot === pot), [summary]);

  const cashPot = potOf('cash');
  const firstClose = summary?.start_cash_from !== 'last_close';
  const start = summary ? (firstClose ? startCash : summary.start_cash) : 0;
  const expected = start + (cashPot?.net ?? 0);
  const difference = counted - expected;

  const bankCheck = useCallback(
    (pot: BankPot) => {
      const row = potOf(pot);
      const edcExpected = (row?.edc_in ?? 0) + (row?.edc_fees ?? 0) + (pot === 'bca' ? tips.tips_bca : tips.tips_bni);
      const slip = slips[pot];
      const edcDiff = slip === null ? null : slip - edcExpected;
      const transfers = linesOf(pot, 'transfer');
      const ticked = transfers.filter((l) => checked.has(l.key)).length;
      const hasEDC = Math.round(edcExpected) !== 0;
      let state: CheckState = 'ok';
      if (edcDiff !== null && Math.round(edcDiff) !== 0) state = 'problem';
      else if ((hasEDC && slip === null) || ticked < transfers.length) state = 'open';
      return { edcExpected, slip, edcDiff, transfers, ticked, hasEDC, state };
    },
    [potOf, linesOf, tips, slips, checked],
  );

  const unassignedLines = linesOf('bank');
  const unassignedTicked = unassignedLines.filter((l) => checked.has(l.key)).length;
  const bca = bankCheck('bca');
  const bni = bankCheck('bni');
  const edcProblem = [bca, bni].some((b) => b.edcDiff !== null && Math.round(b.edcDiff) !== 0);
  const needsNote = (Math.round(difference) !== 0 || edcProblem) && note.trim() === '';
  const tipsToday = tips.tips_cash + tips.tips_bca + tips.tips_bni;
  const branchName = useCallback((id: string) => branches.find((b) => b.id === id)?.name || 'Shop', [branches]);
  const counts = useMemo(() => ({ open: summary?.open_pickups.length ?? 0, out: summary?.open_returns.length ?? 0 }), [summary]);

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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
      // The draft holds what Admin typed, so the reload keeps it.
      applyDay(await apiClient.getDailyClose(summary.date));
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
        edc_slip_bca: slips.bca,
        edc_slip_bni: slips.bni,
        checked_lines: [...checked],
        note,
      });
      localStorage.removeItem(draftKey(summary.branch_id, summary.date));
      applyDay(result, false);
      success('Day closed', `${currentBranch?.name || 'Shop'} · ${result.date} · cash ${differenceText(result.close?.difference ?? 0)}`);
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
                  <th className="py-2 pr-3 text-right font-medium">Cash expected</th>
                  <th className="py-2 pr-3 text-right font-medium">Counted</th>
                  <th className="py-2 pr-3 text-right font-medium">Cash</th>
                  <th className="py-2 pr-3 font-medium">EDC BCA</th>
                  <th className="py-2 pr-3 font-medium">EDC BNI</th>
                  <th className="py-2 pr-3 text-right font-medium">Tips</th>
                  <th className="py-2 pr-3 font-medium">Closed by</th>
                  <th className="py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {history.map((row) => {
                  const edc = (slip: number | null | undefined, exp: number) =>
                    slip === null || slip === undefined ? (
                      <span className="text-slate-400">{Math.round(exp) === 0 ? '—' : 'Not checked'}</span>
                    ) : (
                      <span className={differenceClass(slip - exp)}>{differenceText(slip - exp)}</span>
                    );
                  return (
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
                      <td className={`py-2 pr-3 text-right whitespace-nowrap tabular-nums font-medium ${differenceClass(row.difference)}`}>{differenceText(row.difference)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{edc(row.edc_bca_slip, row.edc_bca_expected)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{edc(row.edc_bni_slip, row.edc_bni_expected)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(row.tips_cash + row.tips_bca + row.tips_bni)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{row.closed_by_name || '—'}</td>
                      <td className="py-2 text-slate-600">{row.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (viewingAll || !summary) {
    return (
      <PageShell title="Daily Close" subtitle="Check each Pot of each shop at the end of the day.">
        <div className="space-y-4">
          <Card>
            <CardContent>
              <p className="text-sm text-slate-700">
                Each shop has its own Cash Drawer and its own EDCs, so you close one shop at a time. Pick a shop in the header to close its day.
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
  const cashState: CheckState = !saved && counted === 0 ? 'open' : Math.round(difference) === 0 ? 'ok' : 'problem';

  const strip: { id: string; label: string; state: CheckState; detail: string }[] = [
    {
      id: 'pot-cash',
      label: 'Cash Drawer',
      state: cashState,
      detail: cashState === 'open' ? `Count it · expected ${formatCurrency(expected)}` : `Cash ${differenceWords(difference)}`,
    },
    ...(['bca', 'bni'] as BankPot[]).map((pot) => {
      const b = pot === 'bca' ? bca : bni;
      const parts = [
        b.hasEDC ? (b.edcDiff === null ? 'EDC slip not entered' : `EDC ${differenceWords(b.edcDiff)}`) : 'No EDC money',
        `${b.ticked} of ${b.transfers.length} lines ticked`,
      ];
      return { id: `pot-${pot}`, label: potLabel(pot), state: b.state, detail: parts.join(' · ') };
    }),
  ];
  if (unassignedLines.length > 0) {
    strip.push({
      id: 'pot-bank',
      label: potLabel('bank'),
      state: unassignedTicked === unassignedLines.length ? 'ok' : 'open',
      detail: `${unassignedTicked} of ${unassignedLines.length} lines ticked`,
    });
  }

  const bankPanel = (pot: BankPot) => {
    const b = pot === 'bca' ? bca : bni;
    const row = potOf(pot) as DailyClosePot;
    const edcLines = linesOf(pot, 'edc');
    const tipKey = pot === 'bca' ? 'tips_bca' : 'tips_bni';
    return (
      <Card key={pot}>
        <div id={`pot-${pot}`} className="scroll-mt-20" />
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle size="lg">{potLabel(pot)}</CardTitle>
            <span className="text-sm text-slate-600">
              In <b className="tabular-nums text-slate-900">{formatCurrency(row.in)}</b> · Out <b className="tabular-nums text-slate-900">{formatCurrency(row.out)}</b>
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            <section data-testid={`edc-${pot}`}>
              <h3 className="text-sm font-semibold text-slate-900">EDC: QRIS, debit, and card</h3>
              <p className="mb-2 text-xs text-slate-500">Check the total with the settlement slip of this shop&apos;s {pot.toUpperCase()} EDC.</p>
              {EDC_METHODS.map((method) => {
                const total = edcLines.filter((l) => l.method === method).reduce((sum, l) => sum + l.in - l.out, 0);
                return <SumRow key={method} label={METHOD_LABELS[method]} value={formatCurrency(total)} />;
              })}
              <SumRow label="Transaction Fees paid on top" value={<span data-testid={`edc-fees-${pot}`}>{formatCurrency(row.edc_fees)}</span>} />
              {row.fees_uncertain > 0 && (
                <p className="text-xs text-amber-700">
                  {row.fees_uncertain} payment{row.fees_uncertain > 1 ? 's' : ''} could take more than one fee rule. The fee shown uses the first rule; the
                  cashier may have picked another one.
                </p>
              )}
              <div className="flex items-center justify-between gap-3 py-1 text-sm text-slate-600">
                <span>Tips on this EDC</span>
                <div className="w-40">
                  <CurrencyInput value={tips[tipKey]} onChange={(n) => setTips((t) => ({ ...t, [tipKey]: n }))} name={`tips-${pot}`} />
                </div>
              </div>
              <SumRow strong label="The slip should show" value={formatCurrency(b.edcExpected)} />
              <div className="mt-2 grid grid-cols-2 items-end gap-3">
                <CurrencyInput
                  label="Slip total"
                  placeholder="Not entered"
                  value={b.slip ?? ''}
                  onChange={(n) => setSlips((s) => ({ ...s, [pot]: n }))}
                  name={`slip-${pot}`}
                />
                <div className={`pb-2 text-base font-semibold ${b.edcDiff === null ? 'text-slate-400' : differenceClass(b.edcDiff)}`} data-testid={`edc-diff-${pot}`}>
                  {b.edcDiff === null ? (b.hasEDC ? 'Not checked' : 'Nothing to check') : differenceText(b.edcDiff)}
                </div>
              </div>
              {edcLines.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-600">EDC payments ({edcLines.length})</summary>
                  <LineTable lines={edcLines} showMethod />
                </details>
              )}
            </section>

            <section>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Transfers and other lines</h3>
                <span className={`text-xs font-medium ${b.ticked === b.transfers.length ? 'text-emerald-700' : 'text-amber-700'}`} data-testid={`ticked-${pot}`}>
                  {b.ticked} of {b.transfers.length} ticked
                </span>
              </div>
              <p className="mb-2 text-xs text-slate-500">Tick each line when you find it on the {pot.toUpperCase()} mutasi.</p>
              <LineTable lines={b.transfers} showMethod checked={checked} onToggle={toggle} testId={`transfers-${pot}`} />
            </section>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            On the books for this shop at the end of {summary.date}: {formatCurrency(row.balance)}. Both shops share the account, so the statement balance is higher.
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageShell
      title="Daily Close"
      subtitle={`${currentBranch?.name || 'Shop'} · Check each Pot, then close the day. A close locks nothing.`}
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
            A payment, expense, or transfer of {rangeText} changed after the close. Check the Pots again and close the day again.
          </div>
        )}

        {/* One status per Pot; a click goes to its panel. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="pot-strip">
          {strip.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="flex items-start gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-black/5 hover:bg-white"
              data-testid={`strip-${item.id}`}
              data-state={item.state}
            >
              <StateIcon state={item.state} />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                <div className="text-xs text-slate-600">{item.detail}</div>
              </div>
            </a>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle size="lg">Rentals to follow up</CardTitle>
          </CardHeader>
          <CardContent>
            {counts.open === 0 && counts.out === 0 ? (
              <p className="text-sm text-emerald-700">Every Pickup of the day happened and no Rental is out past its Return date.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-semibold text-slate-900">
                    Pickups not done <span className="text-slate-500">({counts.open})</span>
                  </div>
                  {counts.open === 0 ? <p className="text-sm text-slate-500">None.</p> : <RentalList rows={summary.open_pickups} dateLabel="pickup" />}
                </div>
                <div>
                  <div className="mb-1 text-sm font-semibold text-slate-900">
                    Still out after the Return date <span className="text-slate-500">({counts.out})</span>
                  </div>
                  {counts.out === 0 ? <p className="text-sm text-slate-500">None.</p> : <RentalList rows={summary.open_returns} dateLabel="due" />}
                  <Link href="/dashboard/return-check" className="mt-2 inline-block text-xs font-medium text-slate-600 hover:text-slate-900">
                    Open Return Check →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash Drawer */}
        <Card>
          <div id="pot-cash" className="scroll-mt-20" />
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle size="lg">Cash Drawer</CardTitle>
              <span className="text-sm text-slate-600">{rangeText}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Cash in</h3>
                <LineTable lines={linesOf('cash').filter((l) => l.in > 0)} testId="cash-in-lines" />
                <h3 className="mt-4 text-sm font-semibold text-slate-900">Cash out</h3>
                <LineTable lines={linesOf('cash').filter((l) => l.out > 0)} testId="cash-out-lines" />
              </section>

              <section>
                {firstClose && (
                  <div className="mb-3 rounded-lg bg-slate-50 p-3 ring-1 ring-black/5">
                    <CurrencyInput label={`Cash in the drawer at the start of ${summary.from_date}`} value={startCash} onChange={setStartCash} />
                    <p className="mt-1 text-xs text-slate-600">
                      First close of this shop.
                      {summary.start_cash_from === 'books' && ` The books say ${formatCurrency(summary.start_cash)}, but they can include old history.`} Type the cash that was in
                      the drawer that morning.
                    </p>
                  </div>
                )}
                <SumRow label={firstClose ? 'Start cash' : `Start cash (counted on ${summary.last_close?.close_date.slice(0, 10)})`} value={formatCurrency(start)} />
                <SumRow label="+ Cash in" value={formatCurrency(cashPot?.in ?? 0)} />
                <SumRow label="− Cash out" value={formatCurrency(cashPot?.out ?? 0)} />
                <SumRow strong label="Expected in the drawer" value={<span data-testid="cash-expected">{formatCurrency(expected)}</span>} />

                <div className="mt-3 grid grid-cols-2 items-end gap-3">
                  <CurrencyInput label="Counted cash" value={counted} onChange={setCounted} />
                  <div className={`pb-2 text-lg font-semibold tabular-nums ${differenceClass(difference)}`} data-testid="close-difference">
                    {differenceText(difference)}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">Count the drawer without the tip bowl. Record a deposit below before you count.</p>

                <div className="mt-4 rounded-lg bg-slate-50 p-3 ring-1 ring-black/5">
                  <div className="text-xs font-semibold text-slate-700">Deposit cash to the bank</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
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
                    <CurrencyInput label="Deposit amount" value={deposit.amount} onChange={(n) => setDeposit((d) => ({ ...d, amount: n }))} />
                    <Input label="Deposit note" placeholder="Deposit at BCA Kuta" value={deposit.note} onChange={(e) => setDeposit((d) => ({ ...d, note: e.target.value }))} />
                    <div className="flex items-end">
                      <Button className="w-full" variant="secondary" loading={saving} disabled={deposit.amount <= 0} onClick={() => void submitDeposit()} data-testid="close-deposit-submit">
                        Record deposit
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </CardContent>
        </Card>

        {bankPanel('bca')}
        {bankPanel('bni')}

        {unassignedLines.length > 0 && (
          <Card>
            <div id="pot-bank" className="scroll-mt-20" />
            <CardHeader>
              <CardTitle size="lg">{potLabel('bank')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-amber-800">
                These non-cash payments named no bank. Find each one on the BCA or BNI mutasi and tick it. Move the money with a Pot Transfer later.
              </p>
              <LineTable lines={unassignedLines} showMethod checked={checked} onToggle={toggle} testId="transfers-bank" />
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">Tips for Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3 md:items-end">
              <CurrencyInput label="Tip bowl (cash)" value={tips.tips_cash} onChange={(n) => setTips((t) => ({ ...t, tips_cash: n }))} />
              <p className="text-sm text-slate-600 md:col-span-2">
                Tips of this close: <b className="tabular-nums text-slate-900">{formatCurrency(tipsToday)}</b> (bowl {formatCurrency(tips.tips_cash)}, BCA EDC{' '}
                {formatCurrency(tips.tips_bca)}, BNI EDC {formatCurrency(tips.tips_bni)}). Tips belong to Staff; the shop shares them at the end of each month.
              </p>
            </div>
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
                          {current && !month.can_share ? ' so far' : ''}: <span className="tabular-nums">{formatCurrency(month.total)}</span>
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

        {/* Close */}
        <Card>
          <CardHeader>
            <CardTitle size="lg">Close the day</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {strip.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <StateIcon state={item.state} />
                  <span className="font-medium text-slate-900">{item.label}</span>
                  <span className="text-slate-600">{item.detail}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-9">
                <Input
                  label={needsNote || Math.round(difference) !== 0 || edcProblem ? 'Note (why the money differs)' : 'Note'}
                  placeholder={Math.round(difference) !== 0 || edcProblem ? 'Change given wrong on INV-…' : 'Optional'}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Button className="w-full" loading={saving} disabled={!summary.can_close || needsNote} onClick={() => void submitClose()} data-testid="close-submit">
                  {saved ? 'Close again' : 'Close the day'}
                </Button>
              </div>
            </div>
            {needsNote && <p className="mt-2 text-xs text-amber-700">Write why the cash or an EDC slip differs before you close.</p>}
            <p className="mt-2 text-xs text-slate-500">
              You can close with lines not ticked yet; the history shows them. The close posts nothing to the books and locks nothing.
            </p>
          </CardContent>
        </Card>

        {historyCard}
      </div>
    </PageShell>
  );
}
