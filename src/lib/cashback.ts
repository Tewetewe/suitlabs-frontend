/**
 * The cashback of a booking. It mirrors `Booking.CanGiveCashback`: it opens
 * at the pickup, so during the rental or after it, with no end date. The
 * amount is a percent of the booking subtotal.
 */
import type { Booking } from '@/types';

/** The cashback in Rupiah: percent of the subtotal, rounded, as `Booking.CashbackAmount`. */
export function cashbackAmount(subtotal: number, percent: number): number {
  return Math.round((subtotal * percent) / 100);
}

/** True for a picked-up booking, active or completed, with no cashback yet. */
export function canGiveCashback(booking: Pick<Booking, 'status' | 'cashback'>): boolean {
  return (booking.status === 'active' || booking.status === 'completed') && !booking.cashback;
}
