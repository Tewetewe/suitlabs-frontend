/**
 * The name a Booking or Rental shows. One phone is one Customer, so a legacy
 * row booked on another person's phone ("Alexander" on Alex's phone) shares
 * that Customer; the row's own name stays on the Booking (full_name).
 * Temporary, with the legacy import.
 */
import type { Booking, Customer } from '@/types';

type Named = Pick<Booking, 'legacy_ref' | 'full_name'> | null | undefined;

export function partyName(booking: Named, customer: Pick<Customer, 'first_name' | 'last_name'> | null | undefined): string {
  const legacyName = booking?.legacy_ref ? (booking.full_name || '').trim() : '';
  if (legacyName) return legacyName;
  return customer ? `${customer.first_name} ${customer.last_name}`.trim() : '';
}
