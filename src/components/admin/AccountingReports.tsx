'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';
import type { AccountingReport, Dividend, Loan, OpeningBalance, Payable } from '@/types';

function dateLabel(value?: string | null) {
  if (!value) return '—';
  return value.slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AccountingReports({
  startDate,
  endDate,
  periodLabel,
  shopLabel,
}: {
  startDate: string;
  endDate: string;
  periodLabel: string;
  shopLabel?: string;
}) {
  const [report, setReport] = useState<AccountingReport | null>(null);
  const [openings, setOpenings] = useState<OpeningBalance[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cashForm, setCashForm] = useState({ as_of_date: startDate, cash_amount: 0, bank_amount: 0, notes: '' });
  const [dividendForm, setDividendForm] = useState({
    dividend_date: endDate,
    amount: 0,
    shareholder: '',
    notes: '',
  });
  const [payableForm, setPayableForm] = useState({
    payable_date: startDate,
    due_date: '',
    description: '',
    vendor: '',
    amount: 0,
  });
  const [loanForm, setLoanForm] = useState({
    loan_date: startDate,
    lender: '',
    principal: 0,
    payment_method: 'transfer',
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [accounting, openingRows, dividendRows, payableRows, loanRows] = await Promise.all([
        apiClient.getAccountingReport({ startDate, endDate }),
        apiClient.getOpeningBalances(),
        apiClient.getDividends(),
        apiClient.getPayables(),
        apiClient.getLoans(),
      ]);
      setReport(accounting);
      setOpenings(openingRows);
      setDividends(dividendRows);
      setPayables(payableRows);
      setLoans(loanRows);
    } catch {
      setError('Failed to load accounting reports');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setCashForm((prev) => ({ ...prev, as_of_date: startDate }));
    setDividendForm((prev) => ({ ...prev, dividend_date: endDate }));
    setPayableForm((prev) => ({ ...prev, payable_date: startDate }));
    setLoanForm((prev) => ({ ...prev, loan_date: startDate }));
  }, [startDate, endDate]);

  const handleOpening = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiClient.createOpeningBalance({
        as_of_date: cashForm.as_of_date,
        cash_amount: Number(cashForm.cash_amount),
        bank_amount: Number(cashForm.bank_amount),
        notes: cashForm.notes || undefined,
      });
      setCashForm({ as_of_date: startDate, cash_amount: 0, bank_amount: 0, notes: '' });
      await load();
    } catch {
      setError('Could not save opening balance');
    } finally {
      setSaving(false);
    }
  };

  const handleDividend = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiClient.createDividend({
        dividend_date: dividendForm.dividend_date,
        amount: Number(dividendForm.amount),
        shareholder: dividendForm.shareholder || undefined,
        notes: dividendForm.notes || undefined,
      });
      setDividendForm({ dividend_date: endDate, amount: 0, shareholder: '', notes: '' });
      await load();
    } catch {
      setError('Could not save dividend');
    } finally {
      setSaving(false);
    }
  };

  const handlePayable = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiClient.createPayable({
        payable_date: payableForm.payable_date,
        due_date: payableForm.due_date || undefined,
        description: payableForm.description,
        vendor: payableForm.vendor || undefined,
        amount: Number(payableForm.amount),
      });
      setPayableForm({ payable_date: startDate, due_date: '', description: '', vendor: '', amount: 0 });
      await load();
    } catch {
      setError('Could not save payable');
    } finally {
      setSaving(false);
    }
  };

  const handleLoan = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      await apiClient.createLoan({
        loan_date: loanForm.loan_date,
        lender: loanForm.lender,
        principal: Number(loanForm.principal),
        payment_method: loanForm.payment_method,
      });
      setLoanForm({ loan_date: startDate, lender: '', principal: 0, payment_method: 'transfer' });
      await load();
    } catch {
      setError('Could not save loan');
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = async () => {
    try {
      setExporting(true);
      const blob = await apiClient.downloadAccountingExcel({ startDate, endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `suitlabs-accounting-${startDate}-to-${endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Could not export Excel');
    } finally {
      setExporting(false);
    }
  };

  const bs = report?.balance_sheet;
  const cf = report?.cash_flow;

  return (
    <>
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="font-semibold text-slate-900">Accrual reports · {shopLabel ? `${shopLabel} · ` : ''}{periodLabel}</div>
              <div className="mt-1 text-sm text-slate-600">
                Cash follows dated Journal Entries. Every event Debits one Ledger Account and Credits another. Cash Drawer is physical cash; Bank is transfer, QRIS, debit, and cards. Tax Pack is not configured.
              </div>
            </div>
            <Button variant="secondary" loading={exporting} onClick={exportExcel}>
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </div>

          {error && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
              <div className="text-xs font-semibold text-slate-500">Cash on Hand</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {loading ? '—' : formatCurrency(report?.cash_on_hand || 0)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Drawer {formatCurrency(report?.cash_drawer || 0)} · Bank {formatCurrency(report?.bank || 0)}
              </div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
              <div className="text-xs font-semibold text-slate-500">Accounts Receivable</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {loading ? '—' : formatCurrency(bs?.accounts_receivable || 0)}
              </div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
              <div className="text-xs font-semibold text-slate-500">Payables + Loans</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {loading ? '—' : formatCurrency((bs?.payables || 0) + (bs?.loans || 0))}
              </div>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white/50 p-4">
              <div className="text-xs font-semibold text-slate-500">Dividends this year</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {loading ? '—' : formatCurrency(report?.year_dividends || 0)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 font-semibold text-slate-900">Balance Sheet · {shopLabel ? `${shopLabel} · ` : ''}{periodLabel}</div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Assets</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  <tr><td className="px-4 py-3">Cash Drawer</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.cash_drawer || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Bank</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.bank || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Accounts Receivable</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.accounts_receivable || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Inventory Assets</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.inventory || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Fixed Assets</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.fixed_assets || 0)}</td></tr>
                  {(bs?.input_tax || 0) !== 0 && (
                    <tr><td className="px-4 py-3">Input Tax</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.input_tax || 0)}</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-white/60 font-semibold">
                  <tr>
                    <td className="px-4 py-3">Total Assets</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(bs?.total_assets || 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Liabilities & Equity</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  <tr><td className="px-4 py-3">Payables</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.payables || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Loans</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.loans || 0)}</td></tr>
                  {(bs?.output_tax || 0) !== 0 && (
                    <tr><td className="px-4 py-3">Output Tax</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.output_tax || 0)}</td></tr>
                  )}
                  <tr><td className="px-4 py-3 font-medium">Total Liabilities</td><td className="px-4 py-3 text-right font-medium">{formatCurrency(bs?.total_liabilities || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Opening Equity</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.opening_equity || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Retained Earnings</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.retained_earnings || 0)}</td></tr>
                  <tr><td className="px-4 py-3">Dividends since opening</td><td className="px-4 py-3 text-right">{formatCurrency(bs?.dividends || 0)}</td></tr>
                </tbody>
                <tfoot className="bg-white/60 font-semibold">
                  <tr>
                    <td className="px-4 py-3">Total Equity</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(bs?.total_equity || 0)}</td>
                  </tr>
                </tfoot>
              </table>
              {(bs?.difference || 0) !== 0 && (
                <div className="px-4 py-2 text-xs text-slate-500">
                  Difference {formatCurrency(bs?.difference || 0)} — Debits and Credits should keep this at zero.
                </div>
              )}
              {(bs?.difference || 0) === 0 && (
                <div className="px-4 py-2 text-xs text-emerald-700">
                  Books balance — assets equal liabilities plus equity.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3 font-semibold text-slate-900">Cash Flow · {shopLabel ? `${shopLabel} · ` : ''}{periodLabel}</div>
          <div className="overflow-x-auto rounded-2xl border border-black/5">
            <table className="min-w-full text-sm">
              <tbody className="divide-y divide-black/5 bg-white/30">
                <tr><td className="px-4 py-3">Beginning cash</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.beginning_cash || 0)}</td></tr>
                <tr><td className="px-4 py-3">Booking collections</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.booking_collections || 0)}</td></tr>
                <tr><td className="px-4 py-3">Sale collections</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.sale_collections || 0)}</td></tr>
                <tr><td className="px-4 py-3">Rental charges</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.rental_charges || 0)}</td></tr>
                <tr><td className="px-4 py-3">Expenses</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.expenses || 0)}</td></tr>
                <tr><td className="px-4 py-3 font-medium">Operating cash flow</td><td className="px-4 py-3 text-right font-medium">{formatCurrency(cf?.operating_cash_flow || 0)}</td></tr>
                <tr><td className="px-4 py-3">Purchases</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.purchases || 0)}</td></tr>
                <tr><td className="px-4 py-3">Loan proceeds</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.loan_proceeds || 0)}</td></tr>
                <tr><td className="px-4 py-3">Loan repayments</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.loan_repayments || 0)}</td></tr>
                <tr><td className="px-4 py-3">Payable payments</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.payable_payments || 0)}</td></tr>
                <tr><td className="px-4 py-3">Dividends</td><td className="px-4 py-3 text-right">{formatCurrency(cf?.dividends || 0)}</td></tr>
                <tr><td className="px-4 py-3 font-semibold">Ending cash</td><td className="px-4 py-3 text-right font-semibold">{formatCurrency(cf?.ending_cash || 0)}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([
              ['Cash', cf?.by_method?.cash],
              ['Transfer', cf?.by_method?.transfer],
              ['QRIS', cf?.by_method?.qris],
              ['Debit', cf?.by_method?.debit],
              ['Credit card', cf?.by_method?.cc],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-black/5 bg-white/50 p-3">
                <div className="text-xs font-semibold text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{formatCurrency(value || 0)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3">
            <div className="font-semibold text-slate-900">Opening Balance</div>
            <div className="text-sm text-slate-600">Record Cash Drawer and Bank as of a date. Inventory, fixed assets, and receivables are snapshotted at save time.</div>
          </div>
          <form onSubmit={handleOpening} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
            <Input label="As of date" type="date" required value={cashForm.as_of_date} onChange={(e) => setCashForm((p) => ({ ...p, as_of_date: e.target.value }))} />
            <CurrencyInput label="Cash Drawer" required value={cashForm.cash_amount || ''} onChange={(n) => setCashForm((p) => ({ ...p, cash_amount: n }))} />
            <CurrencyInput label="Bank" value={cashForm.bank_amount || ''} onChange={(n) => setCashForm((p) => ({ ...p, bank_amount: n }))} />
            <Input label="Notes" value={cashForm.notes} onChange={(e) => setCashForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex items-end">
              <Button type="submit" loading={saving}>Save opening</Button>
            </div>
          </form>
          {openings.length === 0 ? (
            <div className="text-sm text-slate-500">No opening balance yet. Cash on Hand currently starts from dated Payments only.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">As of</th>
                    <th className="px-4 py-3 font-semibold text-right">Cash Drawer</th>
                    <th className="px-4 py-3 font-semibold text-right">Bank</th>
                    <th className="px-4 py-3 font-semibold text-right">Equity snapshot</th>
                    <th className="px-4 py-3 font-semibold">Notes</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  {openings.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{dateLabel(row.as_of_date)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.cash_amount)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.bank_amount || 0)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.equity_amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{row.notes || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          await apiClient.deleteOpeningBalance(row.id);
                          await load();
                        }}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3">
            <div className="font-semibold text-slate-900">Payables</div>
            <div className="text-sm text-slate-600">Money the shop still owes. Recording a Payable Debits an Expense and Credits Payables. Paying it later only moves Cash.</div>
          </div>
          <form onSubmit={handlePayable} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-6">
            <Input label="Date" type="date" required value={payableForm.payable_date} onChange={(e) => setPayableForm((p) => ({ ...p, payable_date: e.target.value }))} />
            <Input label="Due" type="date" value={payableForm.due_date} onChange={(e) => setPayableForm((p) => ({ ...p, due_date: e.target.value }))} />
            <Input label="Description" required value={payableForm.description} onChange={(e) => setPayableForm((p) => ({ ...p, description: e.target.value }))} />
            <Input label="Vendor" value={payableForm.vendor} onChange={(e) => setPayableForm((p) => ({ ...p, vendor: e.target.value }))} />
            <CurrencyInput label="Amount" required value={payableForm.amount || ''} onChange={(n) => setPayableForm((p) => ({ ...p, amount: n }))} />
            <div className="flex items-end">
              <Button type="submit" loading={saving}>Record payable</Button>
            </div>
          </form>
          {payables.length === 0 ? (
            <div className="text-sm text-slate-500">No payables recorded yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  {payables.map((row) => {
                    const outstanding = Math.max(0, row.amount - row.paid_amount);
                    return (
                      <tr key={row.id}>
                        <td className="px-4 py-3">{dateLabel(row.payable_date)}</td>
                        <td className="px-4 py-3">{row.description}{row.vendor ? ` · ${row.vendor}` : ''}</td>
                        <td className="px-4 py-3 capitalize">{row.status}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(outstanding)}</td>
                        <td className="px-4 py-3 text-right">
                          {row.status === 'open' && outstanding > 0 && (
                            <Button variant="ghost" size="sm" onClick={async () => {
                              const paid = window.prompt(`Pay how much of ${formatCurrency(outstanding)}?`, String(outstanding));
                              if (!paid) return;
                              await apiClient.payPayable(row.id, { amount: Number(paid), payment_method: 'transfer', paid_on: todayISO() });
                              await load();
                            }}>Pay</Button>
                          )}
                          {row.paid_amount === 0 && (
                            <Button variant="ghost" size="sm" onClick={async () => {
                              await apiClient.deletePayable(row.id);
                              await load();
                            }}>Delete</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3">
            <div className="font-semibold text-slate-900">Loans</div>
            <div className="text-sm text-slate-600">Receiving a Loan increases Cash on Hand. It is not revenue. Repayment reduces cash and the outstanding Loan.</div>
          </div>
          <form onSubmit={handleLoan} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
            <Input label="Date" type="date" required value={loanForm.loan_date} onChange={(e) => setLoanForm((p) => ({ ...p, loan_date: e.target.value }))} />
            <Input label="Lender" required value={loanForm.lender} onChange={(e) => setLoanForm((p) => ({ ...p, lender: e.target.value }))} />
            <CurrencyInput label="Principal" required value={loanForm.principal || ''} onChange={(n) => setLoanForm((p) => ({ ...p, principal: n }))} />
            <Select
              label="Received via"
              value={loanForm.payment_method}
              onChange={(e) => setLoanForm((p) => ({ ...p, payment_method: e.target.value }))}
              options={[...SALE_PAYMENT_METHOD_OPTIONS]}
            />
            <div className="flex items-end">
              <Button type="submit" loading={saving}>Record loan</Button>
            </div>
          </form>
          {loans.length === 0 ? (
            <div className="text-sm text-slate-500">No loans recorded yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Lender</th>
                    <th className="px-4 py-3 font-semibold text-right">Principal</th>
                    <th className="px-4 py-3 font-semibold text-right">Outstanding</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  {loans.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{dateLabel(row.loan_date)}</td>
                      <td className="px-4 py-3">{row.lender}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.principal)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.outstanding)}</td>
                      <td className="px-4 py-3 text-right">
                        {row.outstanding > 0 && (
                          <Button variant="ghost" size="sm" onClick={async () => {
                            const paid = window.prompt(`Repay how much of ${formatCurrency(row.outstanding)}?`, String(row.outstanding));
                            if (!paid) return;
                            await apiClient.repayLoan(row.id, { amount: Number(paid), payment_method: 'transfer', paid_on: todayISO() });
                            await load();
                          }}>Repay</Button>
                        )}
                        {row.outstanding === row.principal && (
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await apiClient.deleteLoan(row.id);
                            await load();
                          }}>Delete</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-3">
            <div className="font-semibold text-slate-900">Dividends</div>
            <div className="text-sm text-slate-600">Yearly profit to shareholders. This reduces Cash on Hand and Equity; it is not an Expense.</div>
          </div>
          <form onSubmit={handleDividend} className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-5">
            <Input label="Date" type="date" required value={dividendForm.dividend_date} onChange={(e) => setDividendForm((p) => ({ ...p, dividend_date: e.target.value }))} />
            <CurrencyInput label="Amount" required value={dividendForm.amount || ''} onChange={(n) => setDividendForm((p) => ({ ...p, amount: n }))} />
            <Input label="Shareholder" placeholder="Optional" value={dividendForm.shareholder} onChange={(e) => setDividendForm((p) => ({ ...p, shareholder: e.target.value }))} />
            <Input label="Notes" placeholder="Optional" value={dividendForm.notes} onChange={(e) => setDividendForm((p) => ({ ...p, notes: e.target.value }))} />
            <div className="flex items-end">
              <Button type="submit" loading={saving}>Record dividend</Button>
            </div>
          </form>
          {dividends.length === 0 ? (
            <div className="text-sm text-slate-500">No dividends recorded yet.</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-black/5">
              <table className="min-w-full text-sm">
                <thead className="bg-white/60">
                  <tr className="text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Year</th>
                    <th className="px-4 py-3 font-semibold">Shareholder</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/30">
                  {dividends.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{dateLabel(row.dividend_date)}</td>
                      <td className="px-4 py-3">{row.fiscal_year}</td>
                      <td className="px-4 py-3">{row.shareholder || '—'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={async () => {
                          await apiClient.deleteDividend(row.id);
                          await load();
                        }}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
