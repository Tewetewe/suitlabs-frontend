'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { discountAmountFor } from '@/lib/discount';
import type { Discount } from '@/types';

/**
 * The Discount a Booking form picks, for the New Booking form and the cashier
 * POS alike.
 *
 * Eligibility depends on the Customer, the total and the Items, and all three
 * change while Staff works. The backend decides, so this asks again on every
 * change, 400 ms after the typing stops. A stale reply is dropped, so a slow
 * request cannot overwrite a newer list. A typed code picks its own discount,
 * and clearing the code drops it again.
 */
export function useBookingDiscountPick({
  open,
  customerId,
  total,
  itemIds,
}: {
  /** False while the form is closed: nothing is fetched. */
  open: boolean;
  customerId: string;
  total: number;
  /** The Item IDs, joined by commas, so the effect sees a stable value. */
  itemIds: string;
}) {
  const [eligible, setEligible] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [discountId, setDiscountId] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const list = await apiClient.getEligibleBookingDiscounts(
          customerId,
          total,
          itemIds ? itemIds.split(',') : [],
        );
        if (!live) return;
        setEligible(list);
        // A discount that no longer fits must not stay picked, or the save
        // silently drops it after the booking is already written.
        setDiscountId((current) => (current && !list.some((d) => d.id === current) ? '' : current));
      } catch (err) {
        if (!live) return;
        console.error('Failed to load eligible discounts', err);
        setEligible([]);
      } finally {
        if (live) setLoading(false);
      }
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [open, customerId, total, itemIds]);

  // A code cannot override a discount Staff chose by hand: only a match is picked.
  useEffect(() => {
    const typed = code.trim().toUpperCase();
    if (!typed) {
      setDiscountId((current) => {
        const held = eligible.find((discount) => discount.id === current);
        return held?.requires_code ? '' : current;
      });
      return;
    }
    const match = eligible.find((discount) => (discount.code || '').toUpperCase() === typed);
    if (match) setDiscountId(match.id);
  }, [code, eligible]);

  const reset = useCallback(() => {
    setDiscountId('');
    setCode('');
  }, []);

  const picked = eligible.find((discount) => discount.id === discountId);
  return {
    eligible,
    loading,
    discountId,
    setDiscountId,
    code,
    setCode,
    reset,
    picked,
    /** What the picked discount takes off `base`, never more than `cap`. */
    amountOff: (base: number, cap: number) => (picked ? Math.min(discountAmountFor(picked, base), cap) : 0),
  };
}
