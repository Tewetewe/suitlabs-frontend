'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Wallet } from 'lucide-react';

import { MetricTile, PageShell } from '@/components/ui/PageShell';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, NumberInput } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import { Badge, EmptyState, FilterBar, Pagination } from '@/components/ui/DataDisplay';
import SimpleModal from '@/components/modals/SimpleModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { BranchBadge } from '@/components/branch/BranchBadge';
import { useBranch } from '@/contexts/BranchContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiClient } from '@/lib/api';
import { formatCurrency, formatCurrencyCompact } from '@/lib/currency';
import type {
  CreateExpenseRequest,
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseSummary,
  RecurringExpense,
} from '@/types';

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'salary', label: 'Salary' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport', label: 'Transport' },
  { value: 'tax', label: 'Tax' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_OPTIONS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const emptyForm = (): CreateExpenseRequest => ({
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'other',
  description: '',
  amount: 0,
  payment_method: 'cash',
  vendor: '',
  notes: '',
});

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { start, end };
}

function categoryLabel(value: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label || value;
}

function dateLabel(value?: string) {
  if (!value) return '—';
  return value.slice(0, 10);
}

export default function ExpensesPage() {
  const today = useMemo(() => new Date(), []);
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { currentBranch, viewingAll } = useBranch();
  const { success, error } = useToast();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [status, setStatus] = useState<ExpenseStatus | ''>('recorded');

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<CreateExpenseRequest>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const [voidLoading, setVoidLoading] = useState(false);
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringForm, setRecurringForm] = useState({
    category: 'rent' as ExpenseCategory,
    description: '',
    amount: 0,
    payment_method: 'transfer' as ExpensePaymentMethod,
    vendor: '',
    day_of_month: 1,
    start_date: new Date().toISOString().slice(0, 10),
  });

  const range = useMemo(() => monthBounds(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const [list, monthSummary] = await Promise.all([
        apiClient.getExpenses({
          start_date: range.start,
          end_date: range.end,
          search: debouncedSearch || undefined,
          category: category || undefined,
          status: status || undefined,
          page: currentPage,
          limit: itemsPerPage,
        }),
        apiClient.getExpenseSummary({ startDate: range.start, endDate: range.end }),
      ]);
      setExpenses(list.data?.data?.expenses || []);
      setTotal(list.data?.pagination?.total || 0);
      setTotalPages(list.data?.pagination?.total_pages || 1);
      setSummary(monthSummary);
      if (isAdmin) {
        try {
          setRecurring(await apiClient.getRecurringExpenses());
        } catch {
          setRecurring([]);
        }
      }
    } catch (err) {
      console.error(err);
      error('Failed to load expenses', 'Please try again.');
      setExpenses([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, range.start, range.end, debouncedSearch, category, status, currentPage, error, isAdmin]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [loadData, isAuthenticated]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, category, status, selectedYear, selectedMonth]);

  const openCreate = () => {
    setEditing(null);
    const todayStr = new Date().toISOString().slice(0, 10);
    const expenseDate = todayStr >= range.start && todayStr <= range.end ? todayStr : range.start;
    setForm({ ...emptyForm(), expense_date: expenseDate });
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      expense_date: dateLabel(expense.expense_date),
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      payment_method: expense.payment_method || 'cash',
      vendor: expense.vendor || '',
      notes: expense.notes || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) {
      error('Description required', 'Add a short description of this expense.');
      return;
    }
    if (!form.amount || form.amount <= 0) {
      error('Invalid amount', 'Amount must be greater than 0.');
      return;
    }

    try {
      setSaving(true);
      if (editing) {
        await apiClient.updateExpense(editing.id, form);
        success('Expense updated', editing.expense_number);
      } else {
        const created = await apiClient.createExpense(form);
        success('Expense recorded', created.expense_number);
      }
      closeModal();
      await loadData();
    } catch (err) {
      console.error(err);
      error('Could not save expense', 'Check the form and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleVoid = async () => {
    if (!voiding) return;
    try {
      setVoidLoading(true);
      await apiClient.voidExpense(voiding.id);
      success('Expense voided', `${voiding.expense_number} no longer counts toward P&L.`);
      setVoiding(null);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Could not void expense', 'Please try again.');
    } finally {
      setVoidLoading(false);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurringForm.description.trim() || recurringForm.amount <= 0) {
      error('Incomplete form', 'Description and amount are required.');
      return;
    }
    try {
      setRecurringSaving(true);
      await apiClient.createRecurringExpense(recurringForm);
      success('Recurring expense saved', 'It will post automatically each month.');
      setRecurringOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      error('Could not save recurring expense', 'Please try again.');
    } finally {
      setRecurringSaving(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <div className="flex items-center justify-center py-24 text-slate-500">Loading...</div>
      </>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <>
      <PageShell
        title="Expenses"
        subtitle={
          viewingAll
            ? 'Company group — switch to a shop in the header to see that shop’s costs only.'
            : `${currentBranch?.name || 'This shop'} costs only. Not mixed with the other shop.`
        }
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricTile
            label="This month"
            value={formatCurrencyCompact(summary?.total_amount || 0)}
            title={formatCurrency(summary?.total_amount || 0)}
          />
          <MetricTile label="Entries" value={summary?.count || 0} />
          <MetricTile
            label="Top category"
            value={summary?.by_category?.[0] ? categoryLabel(summary.by_category[0].category) : '—'}
          />
        </div>

        {isAdmin && (
          <Card>
            <CardContent>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Recurring expenses</div>
                  <div className="text-xs text-slate-500">Rent, salary, and other monthly costs posted automatically.</div>
                </div>
                <Button size="sm" onClick={() => setRecurringOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add recurring
                </Button>
              </div>
              {recurring.length === 0 ? (
                <div className="rounded-xl border border-black/5 bg-white/40 px-4 py-3 text-sm text-slate-600">
                  No recurring expenses yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-black/5">
                  <table className="min-w-full text-sm">
                    <thead className="bg-white/60">
                      <tr className="text-left text-slate-600">
                        <th className="px-4 py-3 font-semibold">Description</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold text-right">Amount</th>
                        <th className="px-4 py-3 font-semibold">Next post</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 bg-white/30">
                      {recurring.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{row.description}</td>
                          <td className="px-4 py-3">{categoryLabel(row.category)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-3">{dateLabel(row.next_run_date)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={row.is_active ? 'success' : 'default'}>
                              {row.is_active ? 'active' : 'paused'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={async () => {
                                  try {
                                    await apiClient.postRecurringExpense(row.id);
                                    success('Posted', row.description);
                                    await loadData();
                                  } catch (err) {
                                    console.error(err);
                                    error('Could not post', 'It may already be posted this month.');
                                  }
                                }}
                              >
                                Post
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await apiClient.updateRecurringExpense(row.id, { is_active: !row.is_active });
                                  await loadData();
                                }}
                              >
                                {row.is_active ? 'Pause' : 'Resume'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {summary && summary.by_category.length > 0 && (
          <Card>
            <CardContent>
              <div className="mb-3 text-sm font-semibold text-slate-800">By category</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {summary.by_category.map((row) => (
                  <div key={row.category} className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-sm">
                    <span className="text-slate-600">{categoryLabel(row.category)}</span>
                    <span className="font-medium text-slate-900">{formatCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <FilterBar>
          <Input
            placeholder="Search description, vendor, number..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Select
            searchable={false}
            value={String(selectedYear)}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            options={[today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2].map((year) => ({
              value: String(year),
              label: String(year),
            }))}
          />
          <Select
            searchable={false}
            value={String(selectedMonth)}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            options={['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((name, i) => ({
              value: String(i + 1),
              label: name,
            }))}
          />
          <Select
            searchable={false}
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory | '')}
            options={[
              { value: '', label: 'All categories' },
              ...CATEGORY_OPTIONS,
            ]}
          />
          <Select
            searchable={false}
            value={status}
            onChange={(e) => setStatus(e.target.value as ExpenseStatus | '')}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'recorded', label: 'Recorded' },
              { value: 'voided', label: 'Voided' },
            ]}
          />
        </FilterBar>

        {loading ? (
          <div className="rounded-2xl border border-black/5 bg-white/40 px-4 py-10 text-center text-sm text-slate-500">
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title="No expenses this month"
            description="Add rent, salary, supplies, and other shop costs so the monthly P&L is complete."
            action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Expense</Button>}
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-black/5">
            <table className="min-w-full text-sm">
              <thead className="bg-white/60">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Number</th>
                  <th className="px-4 py-3 font-semibold">Shop</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 bg-white/30">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="text-slate-800">
                    <td className="px-4 py-3 whitespace-nowrap">{dateLabel(expense.expense_date)}</td>
                    <td className="px-4 py-3 font-medium">{expense.expense_number}</td>
                    <td className="px-4 py-3"><BranchBadge branch={expense.branch} always /></td>
                    <td className="px-4 py-3">{categoryLabel(expense.category)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{expense.description}</div>
                      {expense.vendor && <div className="text-xs text-slate-500">{expense.vendor}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatCurrency(expense.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={expense.status === 'recorded' ? 'success' : 'danger'}>
                        {expense.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {expense.status === 'recorded' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEdit(expense)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setVoiding(expense)}>
                            Void
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          total={total}
          perPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </PageShell>

      <SimpleModal
        isOpen={modalOpen}
        title={editing ? `Edit ${editing.expense_number}` : 'Add Expense'}
        onClose={closeModal}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button type="submit" form="expense-form" loading={saving}>
              {editing ? 'Save changes' : 'Record expense'}
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Date"
            type="date"
            required
            value={form.expense_date}
            onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
          />
          <Select
            searchable={false}
            label="Category"
            options={CATEGORY_OPTIONS}
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ExpenseCategory }))}
          />
          <Input
            label="Description"
            required
            placeholder="e.g. Shop rent August"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <CurrencyInput
            label="Amount"
            required
            value={form.amount || ''}
            onChange={(n) => setForm((prev) => ({ ...prev, amount: n }))}
          />
          <Select
            searchable={false}
            label="Payment method"
            options={PAYMENT_OPTIONS}
            value={form.payment_method || 'cash'}
            onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value as ExpensePaymentMethod }))}
          />
          <Input
            label="Vendor / payee"
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

      <SimpleModal
        isOpen={!!voiding}
        title="Void expense"
        onClose={() => setVoiding(null)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoiding(null)} disabled={voidLoading}>Cancel</Button>
            <Button variant="danger" loading={voidLoading} onClick={handleVoid}>Void</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Void {voiding?.expense_number}? It will stay in the list but will not count toward Profit & Loss.
        </p>
      </SimpleModal>

      <SimpleModal
        isOpen={recurringOpen}
        title="Add recurring expense"
        onClose={() => setRecurringOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRecurringOpen(false)} disabled={recurringSaving}>Cancel</Button>
            <Button type="submit" form="recurring-form" loading={recurringSaving}>Save recurring</Button>
          </>
        }
      >
        <form id="recurring-form" onSubmit={handleCreateRecurring} className="space-y-4">
          <Input
            label="Description"
            required
            placeholder="e.g. Shop rent"
            value={recurringForm.description}
            onChange={(e) => setRecurringForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <Select
            searchable={false}
            label="Category"
            options={CATEGORY_OPTIONS}
            value={recurringForm.category}
            onChange={(e) => setRecurringForm((prev) => ({ ...prev, category: e.target.value as ExpenseCategory }))}
          />
          <CurrencyInput
            label="Amount"
            required
            value={recurringForm.amount || ''}
            onChange={(n) => setRecurringForm((prev) => ({ ...prev, amount: n }))}
          />
          <NumberInput
            label="Day of month (1-28)"
            min={1}
            max={28}
            value={recurringForm.day_of_month}
            onChange={(n) => setRecurringForm((prev) => ({ ...prev, day_of_month: n }))}
          />
          <Input
            label="Start date"
            type="date"
            required
            value={recurringForm.start_date}
            onChange={(e) => setRecurringForm((prev) => ({ ...prev, start_date: e.target.value }))}
          />
          <Select
            searchable={false}
            label="Payment method"
            options={PAYMENT_OPTIONS}
            value={recurringForm.payment_method}
            onChange={(e) => setRecurringForm((prev) => ({ ...prev, payment_method: e.target.value as ExpensePaymentMethod }))}
          />
          <Input
            label="Vendor / payee"
            placeholder="Optional"
            value={recurringForm.vendor}
            onChange={(e) => setRecurringForm((prev) => ({ ...prev, vendor: e.target.value }))}
          />
        </form>
      </SimpleModal>
    </>
  );
}
