/**
 * The money rules of a Booking that is not saved yet.
 *
 * The New Booking form and the cashier POS both build a Booking. They show it
 * in different layouts, but they must charge the same amounts and send the
 * same statuses, so both read these rules from here.
 */
import { rentalPrice, type RentalLength } from './rental-window';

/** A down payment takes this share of the amount due, as `DownPaymentShare` in the backend. */
export const DOWN_PAYMENT_SHARE = 0.5;

/** Half of the amount due, rounded up to a whole Rupiah, as `Booking.BookingPaymentDue`. */
export function halfDownPayment(total: number): number {
  return Math.min(Math.ceil(total * DOWN_PAYMENT_SHARE), total);
}

/**
 * What the Customer pays on this save. It mirrors `Booking.TakeBookingPayment`:
 * a full payment takes all of the amount due. A down payment takes the typed
 * amount, or else what was already paid, or else half. A save never lowers
 * money already taken, and never takes more than the amount due.
 */
export function bookingPayNow({
  total,
  downPayment,
  typedDownPayment = 0,
  alreadyPaid = 0,
}: {
  total: number;
  downPayment: boolean;
  typedDownPayment?: number;
  alreadyPaid?: number;
}): number {
  if (!downPayment) return Math.max(0, total);
  const fallback = alreadyPaid > 0 ? Math.min(alreadyPaid, total) : halfDownPayment(total);
  const due = typedDownPayment > 0 ? Math.min(typedDownPayment, total) : fallback;
  return Math.max(0, Math.min(Math.max(due, alreadyPaid), total));
}

/**
 * A typed Subtotal. Above the Items it charges items not in the catalogue yet
 * (`extra`); below them it is an error, because a Discount takes money off.
 */
export function typedSubtotal(typed: number, itemsSubtotal: number): { tooLow: boolean; extra: number } {
  return {
    tooLow: typed > 0 && typed < itemsSubtotal,
    extra: typed > itemsSubtotal ? typed - itemsSubtotal : 0,
  };
}

/** The amount before Discount: a package with its add-ons, or the Items with the Subtotal extra. */
export function bookingGross({
  packagePrice,
  addonSubtotal,
  itemsSubtotal,
  extra = 0,
}: {
  packagePrice: number;
  addonSubtotal: number;
  itemsSubtotal: number;
  extra?: number;
}): number {
  return packagePrice > 0 ? packagePrice + addonSubtotal : itemsSubtotal + extra;
}

/**
 * The statuses a new Booking starts with. Money taken confirms it. The backend
 * works the payment status out again from the money, so this only keeps the
 * request honest.
 */
export function newBookingStatuses(paid: number, total: number): {
  status: 'pending' | 'confirmed';
  payment_status: 'pending' | 'partial' | 'completed';
} {
  return {
    status: paid > 0 ? 'confirmed' : 'pending',
    payment_status: paid <= 0 ? 'pending' : paid >= total ? 'completed' : 'partial',
  };
}

/**
 * Spreads a booking discount across the lines in proportion to their totals,
 * as the backend does. The backend reads the discount only from the lines.
 */
export function spreadDiscount(lineTotals: number[], discount: number): number[] {
  const sum = lineTotals.reduce((acc, line) => acc + line, 0);
  let left = Math.min(Math.max(discount, 0), sum);
  return lineTotals.map((line, index) => {
    const share = index === lineTotals.length - 1 || sum <= 0
      ? left
      : Math.round(discount * (line / sum));
    const taken = Math.min(share, line, left);
    left -= taken;
    return taken;
  });
}

type PricedItem = Parameters<typeof rentalPrice>[0];

/**
 * A new Rental Length moves each line that is still at the old length's price.
 * A price Staff typed by hand stays.
 */
export function repriceForLength<L extends { unit_price: number }>(
  lines: L[],
  itemFor: (line: L) => PricedItem | undefined,
  from: RentalLength,
  to: RentalLength,
): L[] {
  if (from === to) return lines;
  return lines.map((line) => {
    const item = itemFor(line);
    return item && line.unit_price === rentalPrice(item, from)
      ? { ...line, unit_price: rentalPrice(item, to) }
      : line;
  });
}

/** The code of the default Trousers that a Suit or a Jacket brings, if any. */
export function defaultTrousersCode(item: { type?: string; trousers_code?: string } | undefined): string {
  if (!item?.trousers_code) return '';
  return item.type === 'suit' || item.type === 'jacket' ? item.trousers_code : '';
}
