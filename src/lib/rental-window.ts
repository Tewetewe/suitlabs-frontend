/**
 * Rental Length and the rental window. Same rule as the backend
 * (entity/rental_length.go): for the Event Date, the day the Customer wears
 * the Items, a 3-day rental is picked up the day before and returned the day
 * after; a 4-hour rental is picked up and returned on the event day. The
 * Return is due by 20:00 either way.
 */

export type RentalLength = '3d' | '4h';

export const RENTAL_LENGTHS: { value: RentalLength; label: string }[] = [
  { value: '3d', label: '3 days' },
  { value: '4h', label: '4 hours' },
];

function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d + days));
  return day.toISOString().slice(0, 10);
}

/** The Pickup and Return dates (YYYY-MM-DD) for an Event Date (YYYY-MM-DD). */
export function rentalWindow(eventDate: string, length: RentalLength): { pickup: string; ret: string } {
  if (length === '4h') return { pickup: eventDate, ret: eventDate };
  return { pickup: shiftDay(eventDate, -1), ret: shiftDay(eventDate, 1) };
}

type Priced = { standard_price?: number; four_hour_price?: number };

/** The rental price of an Item for the length. An Item with no 4-hour price falls back to its 3-day price. */
export function rentalPrice(item: Priced, length: RentalLength): number {
  if (length === '4h' && (item.four_hour_price || 0) > 0) return item.four_hour_price || 0;
  return item.standard_price || 0;
}

/** True when a 4-hour rental of the Item uses its 3-day price, because it has no 4-hour price. */
export function missingFourHourPrice(item: Priced, length: RentalLength): boolean {
  return length === '4h' && !((item.four_hour_price || 0) > 0);
}
