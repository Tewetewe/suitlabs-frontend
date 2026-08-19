'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { Button } from '@/components/ui/Button';
import { Input, NumberInput } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Select } from '@/components/ui/Select';
import AutoCompleteSelect from '@/components/ui/AutoCompleteSelect';
import { CreateSaleRequest, Item, Rental, RentalItem, SaleLineType, SalePaymentMethod } from '@/types';
import { customerOptionLabel } from '@/lib/branch-scope';
import { SALE_PAYMENT_METHOD_OPTIONS } from '@/lib/payment-methods';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Badge } from '@/components/ui/DataDisplay';

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
  /**
   * The rental this sale belongs to. A completed or cancelled rental refuses the
   * sale on the server, so the composer says so before anything is typed.
   */
  rentalStatus?: Rental['status'];
  submitLabel?: string;
  onSubmit: (payload: CreateSaleRequest) => Promise<void>;
  submitting?: boolean;
};

function defaultSellPrice(item: Item): number {
  return item.selling_price || 0;
}

/** The three line types in words. The raw token means nothing to a cashier. */
const LINE_TYPE_LABEL: Record<SaleLineType, string> = {
  retail: 'Retail',
  clearance: 'Clearance',
  replacement: 'Lost item charge',
};

/**
 * A suit or a jacket leaving the shop for good is a clearance, not a retail
 * sale. It is only the starting point — the cart lets the cashier change it.
 */
function defaultLineType(item: Item): SaleLineType {
  return item.type === 'suit' || item.type === 'jacket' ? 'clearance' : 'retail';
}

export function SaleComposer({
  bookingId,
  rentalId,
  customerId,
  rentalItems = [],
  rentalStatus,
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

  const addItem = (item: Item, lineType: SaleLineType = defaultLineType(item)) => {
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
      .filter((line) => line.item && line.item.status !== 'lost' && lostChecked[line.item_id])
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

  const lostCount = lostLines.reduce((sum, line) => sum + line.quantity, 0);
  const soldCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  /** A lost item charged nothing is almost always a forgotten fee. */
  const feelessLost = lostLines.filter((line) => line.unit_price <= 0);
  const rentalClosed = rentalStatus === 'completed' || rentalStatus === 'cancelled';

  /**
   * Why the button is off, in the words of the thing that has to change.
   *
   * The server refuses a sale on a closed rental and a line over an unpriced
   * item, so the composer names both before the cashier taps Complete.
   */
  const blocker = rentalClosed
    ? `This rental is ${rentalStatus}. Lost items and add-ons have to be recorded before the rental is completed.`
    : allLines.length === 0
      ? null
      : discountAmount > subtotal
        ? 'The discount is larger than the subtotal.'
        : feelessLost.length > 0
          ? `Type a replacement fee for ${feelessLost.map((line) => line.item.name).join(', ')}.`
          : null;

  /** What tapping Complete will do, counted out before it happens. */
  const outcome = [
    soldCount > 0 ? `sells ${soldCount} item${soldCount === 1 ? '' : 's'}` : null,
    lostCount > 0 ? `marks ${lostCount} item${lostCount === 1 ? '' : 's'} lost` : null,
  ].filter(Boolean).join(' · ');

  const handleSubmit = async () => {
    if (allLines.length === 0 || blocker) return;
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
        {rentalClosed && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{blocker}</span>
          </div>
        )}

        {rentalItems.length > 0 && (
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Lost items</h3>
            <p className="mb-3 mt-1 text-xs text-slate-500">
              Mark anything missing at return. The item leaves stock as lost, and the customer pays the
              replacement fee on this sale. Record it before the rental is completed.
            </p>
            <div className="space-y-2">
              {rentalItems.map((line) => {
                const item = line.item;
                if (!item) return null;
                const marked = !!lostChecked[line.item_id];
                const fee = Number(lostFees[line.item_id] || 0);
                // The server refuses a second write-off, so a line already
                // recorded lost is out of play here.
                const alreadyLost = item.status === 'lost';
                return (
                  <div
                    key={line.id}
                    className={clsx(
                      'rounded-xl border p-3 transition-colors',
                      marked ? 'border-red-200 bg-red-50/60' : 'border-black/5',
                    )}
                  >
                    <label className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-red-600"
                        style={{ appearance: 'auto' }}
                        checked={marked && !alreadyLost}
                        disabled={rentalClosed || alreadyLost}
                        onChange={(e) => setLostChecked((prev) => ({ ...prev, [line.item_id]: e.target.checked }))}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{item.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.code} · {line.quantity} rented
                          {alreadyLost ? ' · already recorded lost' : ''}
                        </span>
                      </span>
                      {alreadyLost ? (
                        <Badge variant="default">Written off</Badge>
                      ) : (
                        marked && <Badge variant="danger">Lost</Badge>
                      )}
                    </label>

                    {/* The fee only appears once the item is marked, so nobody
                        types a number that does nothing. */}
                    {marked && !alreadyLost && (
                      <div className="mt-3">
                        <CurrencyInput
                          label="Replacement fee"
                          value={lostFees[line.item_id] || ''}
                          onChange={(n) => setLostFees((prev) => ({ ...prev, [line.item_id]: n ? String(n) : '' }))}
                          error={fee <= 0 ? 'Enter what the customer pays for this item.' : undefined}
                          helperText={
                            fee > 0 && fee === defaultSellPrice(item)
                              ? 'The selling price on the item. Change it if you agreed another amount.'
                              : undefined
                          }
                        />
                      </div>
                    )}
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
            <p className="text-sm text-slate-500">
              {rentalItems.length > 0
                ? 'Add a sellable item, or mark a rented item lost.'
                : 'Search stock on the left and add an item.'}
            </p>
          ) : (
            <div className="space-y-3">
              {allLines.map((line) => {
                const lost = !!line.replacement_for_item_id;
                return (
                  <div
                    key={line.key}
                    className={clsx('rounded-xl border p-3', lost ? 'border-red-200 bg-red-50/60' : 'border-black/5')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">{line.item.name}</div>
                        <div className="text-xs text-slate-500">{line.item.code}</div>
                      </div>
                      {/* A lost line comes from the panel above, so removing it
                          here unmarks it there. Before, the only way out was to
                          scroll back up and hunt for the checkbox. */}
                      <button
                        type="button"
                        aria-label={lost ? `Stop charging ${line.item.name} as lost` : `Remove ${line.item.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                        onClick={() => {
                          if (lost) {
                            setLostChecked((prev) => ({ ...prev, [line.replacement_for_item_id as string]: false }));
                            return;
                          }
                          setCart((prev) => prev.filter((entry) => entry.key !== line.key));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {lost ? (
                        <div className="sm:col-span-2">
                          <Badge variant="danger">{LINE_TYPE_LABEL.replacement}</Badge>
                          <p className="mt-1 text-xs text-slate-500">
                            {line.quantity} unit{line.quantity === 1 ? '' : 's'}, taken from the rental line. Edit the fee above.
                          </p>
                        </div>
                      ) : (
                        <>
                          <Select
                            searchable={false}
                            label="Line type"
                            value={line.line_type}
                            onChange={(e) =>
                              setCart((prev) =>
                                prev.map((entry) =>
                                  entry.key === line.key
                                    ? { ...entry, line_type: e.target.value as SaleLineType }
                                    : entry,
                                ),
                              )
                            }
                            options={[
                              { value: 'retail', label: LINE_TYPE_LABEL.retail },
                              { value: 'clearance', label: LINE_TYPE_LABEL.clearance },
                            ]}
                            helperText={
                              line.line_type === 'clearance'
                                ? 'Rental stock sold off for good.'
                                : 'Ordinary shop stock.'
                            }
                          />
                          <NumberInput
                            label="Qty"
                            min={1}
                            max={line.item.available_qty ?? line.item.quantity}
                            value={line.quantity}
                            onChange={(qty) =>
                              setCart((prev) =>
                                prev.map((entry) =>
                                  entry.key === line.key ? { ...entry, quantity: Math.max(1, qty || 1) } : entry,
                                ),
                              )
                            }
                            helperText={`${line.item.available_qty ?? line.item.quantity} in stock`}
                          />
                          <CurrencyInput
                            label="Price"
                            value={line.unit_price}
                            onChange={(n) =>
                              setCart((prev) =>
                                prev.map((entry) => (entry.key === line.key ? { ...entry, unit_price: n } : entry)),
                              )
                            }
                          />
                          <div className="flex items-end justify-end pb-2.5 text-sm font-medium tabular-nums text-slate-900">
                            {formatCurrency(line.quantity * line.unit_price)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
            error={discountAmount > subtotal ? 'Larger than the subtotal.' : undefined}
          />
          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="tabular-nums text-red-600">-{formatCurrency(Math.min(discountAmount, subtotal))}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>

          {/* Marking an item lost changes stock, so the cashier reads what the
              button is about to do before pressing it. */}
          {outcome && !blocker && (
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              This {outcome}.
            </p>
          )}
          {blocker && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{blocker}</span>
            </p>
          )}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || allLines.length === 0 || !!blocker}
            loading={submitting}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
