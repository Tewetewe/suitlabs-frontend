'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { Input, NumberInput } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import AutoCompleteSelect from '@/components/ui/AutoCompleteSelect';
import { CreateSaleRequest, Item, RentalItem, SaleLineType, SalePaymentMethod } from '@/types';
import { customerOptionLabel } from '@/lib/branch-scope';
import { SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';
import { Plus, Trash2 } from 'lucide-react';

export type CartLine = {
  key: string;
  item: Item;
  quantity: number;
  unit_price: number;
  line_type: SaleLineType;
  replacement_for_item_id?: string;
  notes?: string;
};

type SaleComposerProps = {
  bookingId?: string;
  rentalId?: string;
  customerId?: string;
  rentalItems?: RentalItem[];
  submitLabel?: string;
  onSubmit: (payload: CreateSaleRequest) => Promise<void>;
  submitting?: boolean;
};

function defaultSellPrice(item: Item): number {
  return item.selling_price || 0;
}

export function SaleComposer({
  bookingId,
  rentalId,
  customerId,
  rentalItems = [],
  submitLabel = 'Complete Sale',
  onSubmit,
  submitting = false,
}: SaleComposerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Item[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('cash');
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [lostFees, setLostFees] = useState<Record<string, string>>({});
  const [lostChecked, setLostChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelectedCustomerId(customerId || '');
  }, [customerId]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    rentalItems.forEach((line) => {
      if (!line.item) return;
      initial[line.item_id] = String(defaultSellPrice(line.item));
    });
    setLostFees(initial);
  }, [rentalItems]);

  const loadSellable = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const response = await apiClient.getItems({
        search: query || undefined,
        is_sellable: true,
        page: 1,
        limit: 20,
      });
      setResults(response.data?.data?.items || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadSellable(search);
    }, 250);
    return () => clearTimeout(handle);
  }, [search, loadSellable]);

  const fetchCustomerPage = useCallback(async (query: string, page: number) => {
    try {
      const response = await apiClient.getCustomers({
        search: query || undefined,
        page,
        limit: 20,
        is_active: true,
      });
      const rows = response?.data?.data?.customers || [];
      return {
        options: rows.map((customer) => ({
          value: customer.id,
          label: customerOptionLabel(customer),
        })),
        hasMore: Boolean(response?.data?.pagination?.has_next),
      };
    } catch {
      return { options: [], hasMore: false };
    }
  }, []);

  const addItem = (item: Item, lineType: SaleLineType = item.type === 'suit' || item.type === 'jacket' ? 'clearance' : 'retail') => {
    setCart((prev) => {
      const existing = prev.find((line) => line.item.id === item.id && line.line_type === lineType && !line.replacement_for_item_id);
      if (existing) {
        return prev.map((line) =>
          line.key === existing.key ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [
        ...prev,
        {
          key: `${item.id}-${lineType}-${Date.now()}`,
          item,
          quantity: 1,
          unit_price: defaultSellPrice(item),
          line_type: lineType,
        },
      ];
    });
  };

  const lostLines: CartLine[] = useMemo(() => {
    return rentalItems
      .filter((line) => line.item && lostChecked[line.item_id])
      .map((line) => ({
        key: `lost-${line.item_id}`,
        item: line.item as Item,
        quantity: line.quantity || 1,
        unit_price: Number(lostFees[line.item_id] || 0),
        line_type: 'replacement' as const,
        replacement_for_item_id: line.item_id,
        notes: 'Lost item replacement fee',
      }));
  }, [rentalItems, lostChecked, lostFees]);

  const allLines = [...lostLines, ...cart];
  const subtotal = allLines.reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
  const discountAmount = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  const handleSubmit = async () => {
    if (allLines.length === 0) return;
    const payload: CreateSaleRequest = {
      customer_id: selectedCustomerId || undefined,
      booking_id: bookingId || undefined,
      rental_id: rentalId || undefined,
      source: rentalId ? 'rental_return' : bookingId ? 'booking_addon' : 'standalone',
      discount_amount: discountAmount,
      paid_amount: total,
      payment_method: paymentMethod,
      notes,
      items: allLines.map((line) => ({
        item_id: line.item.id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        line_type: line.line_type,
        replacement_for_item_id: line.replacement_for_item_id,
        notes: line.notes,
      })),
    };
    try {
      await onSubmit(payload);
    } catch {
      // Parent already shows the error toast.
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        {rentalItems.length > 0 && (
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Lost items</h3>
            <p className="mb-3 text-xs text-slate-500">
              Check anything missing at return. Replacement fee is charged before the rental is completed.
            </p>
            <div className="space-y-3">
              {rentalItems.map((line) => {
                const item = line.item;
                if (!item) return null;
                return (
                  <div key={line.id} className="flex flex-col gap-2 rounded-lg border border-black/5 p-3 sm:flex-row sm:items-center">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!lostChecked[line.item_id]}
                        onChange={(e) =>
                          setLostChecked((prev) => ({ ...prev, [line.item_id]: e.target.checked }))
                        }
                      />
                      <span className="truncate">
                        {item.name} <span className="text-slate-400">({item.code})</span>
                      </span>
                    </label>
                    <CurrencyInput
                      label="Replacement fee"
                      value={lostFees[line.item_id] || ''}
                      onChange={(n) => setLostFees((prev) => ({ ...prev, [line.item_id]: n ? String(n) : '' }))}
                      className="sm:w-40"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Sellable items</h3>
          <Input
            label="Search stock"
            placeholder="Socks, tumbler, old suit…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {searching && <p className="text-sm text-slate-500">Searching…</p>}
            {!searching && results.length === 0 && (
              <p className="text-sm text-slate-500">No sellable items. Mark an item as sellable in Items first.</p>
            )}
            {results.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/5 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.code} · stock {item.available_qty ?? item.quantity} · {formatCurrency(defaultSellPrice(item))}
                  </div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => addItem(item)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Cart</h3>
          {allLines.length === 0 ? (
            <p className="text-sm text-slate-500">Add a retail item or mark a lost item.</p>
          ) : (
            <div className="space-y-3">
              {allLines.map((line) => (
                <div key={line.key} className="rounded-lg border border-black/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{line.item.name}</div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">{line.line_type}</div>
                    </div>
                    {!line.replacement_for_item_id && (
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-600"
                        onClick={() => setCart((prev) => prev.filter((entry) => entry.key !== line.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <NumberInput
                      label="Qty"
                      min={1}
                      value={line.quantity}
                      onChange={(qty) => {
                        if (line.replacement_for_item_id) return;
                        setCart((prev) => prev.map((entry) => (entry.key === line.key ? { ...entry, quantity: Math.max(1, qty || 1) } : entry)));
                      }}
                      disabled={!!line.replacement_for_item_id}
                    />
                    <CurrencyInput
                      label="Price"
                      value={line.unit_price}
                      onChange={(n) => {
                        if (line.replacement_for_item_id) {
                          setLostFees((prev) => ({ ...prev, [line.replacement_for_item_id as string]: String(n) }));
                          return;
                        }
                        setCart((prev) => prev.map((entry) => (entry.key === line.key ? { ...entry, unit_price: n } : entry)));
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4 space-y-3">
          <AutoCompleteSelect
            label="Customer (optional)"
            value={selectedCustomerId}
            onChange={setSelectedCustomerId}
            placeholder="Walk-in or search customer"
            minQueryLength={0}
            emptyMessage="No matching customers"
            emptyOption={{ value: '', label: 'Walk-in' }}
            fetchPage={fetchCustomerPage}
          />
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as SalePaymentMethod)}
            options={[...SALE_PAYMENT_METHOD_OPTIONS]}
          />
          <CurrencyInput
            label="Discount"
            value={discount}
            onChange={(n) => setDiscount(n ? String(n) : '')}
          />
          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || allLines.length === 0}
            loading={submitting}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
