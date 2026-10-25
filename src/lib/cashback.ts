/**
 * The cashback of a booking. It mirrors `Booking.CanGiveCashback`: the window
 * opens at the pickup, so during the rental or after it, and closes 7 days
 * after the pickup. The amount is a percent of the booking subtotal.
 */
import type { Booking } from '@/types';

/** How long after the pickup Staff can give a cashback, as `CashbackWindowDays`. */
export const CASHBACK_WINDOW_DAYS = 7;

type CashbackBooking = Pick<Booking, 'status' | 'booking_date' | 'cashback'> & {
  rental?: { actual_pickup_date?: string } | null;
};

/** The last day for a cashback, as YYYY-MM-DD: the pickup day plus 7 days. */
export function cashbackLastDay(booking: CashbackBooking): string {
  const pickup = booking.rental?.actual_pickup_date || booking.booking_date;
  const day = new Date(pickup);
  const local = new Date(day.getFullYear(), day.getMonth(), day.getDate() + CASHBACK_WINDOW_DAYS);
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
}

/** The cashback in Rupiah: percent of the subtotal, rounded, as `Booking.CashbackAmount`. */
export function cashbackAmount(subtotal: number, percent: number): number {
  return Math.round((subtotal * percent) / 100);
}

/** True once the 7 days after the pickup are over. */
export function cashbackWindowClosed(booking: CashbackBooking, now: Date = new Date()): boolean {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return today > cashbackLastDay(booking);
}

/**
 * True while a picked-up booking with no cashback is inside the window. Admin
 * gives one on a completed booking at any time, to reconcile older bookings.
 */
export function canGiveCashback(booking: CashbackBooking, now: Date = new Date(), admin = false): boolean {
  if ((booking.status !== 'active' && booking.status !== 'completed') || booking.cashback) return false;
  if (admin && booking.status === 'completed') return true;
  return !cashbackWindowClosed(booking, now);
}
