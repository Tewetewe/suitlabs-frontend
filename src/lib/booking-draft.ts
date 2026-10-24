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

/**
 * The amount before Discount: a package with its add-ons, or the Items with
 * the Subtotal extra. Custom lines add on top either way, as in
 * Booking.CalculateTotals.
 */
export function bookingGross({
  packagePrice,
  addonSubtotal,
  itemsSubtotal,
  extra = 0,
  customSubtotal = 0,
}: {
  packagePrice: number;
  addonSubtotal: number;
  itemsSubtotal: number;
  extra?: number;
  customSubtotal?: number;
}): number {
  return (packagePrice > 0 ? packagePrice + addonSubtotal : itemsSubtotal + extra) + customSubtotal;
}

/**
 * A custom line as a form holds it: a name, a quantity and a price. With a
 * package, is_addon charges it on top, and any other line is included in the
 * package price (BookingCustomLine.Charged).
 */
export type CustomLineDraft = { name: string; quantity: number; unit_price: number; is_addon?: boolean };

/** True when the line adds to the amount: always without a package, as an add-on with one. */
export function customLineCharged(line: Pick<CustomLineDraft, 'is_addon'>, hasPackage: boolean): boolean {
  return !hasPackage || !!line.is_addon;
}

/** The custom lines a save sends: named ones only, with a quantity of at least 1. */
export function customLinesForRequest(lines: CustomLineDraft[]): Required<CustomLineDraft>[] {
  return lines
    .map((line) => ({
      name: line.name.trim(),
      quantity: Math.max(1, Math.floor(line.quantity || 1)),
      unit_price: Math.max(0, line.unit_price || 0),
      is_addon: !!line.is_addon,
    }))
    .filter((line) => line.name !== '');
}

/** The sum of the custom lines that are charged. */
export function customLinesTotal(lines: CustomLineDraft[], hasPackage = false): number {
  return customLinesForRequest(lines)
    .filter((line) => customLineCharged(line, hasPackage))
    .reduce((sum, line) => sum + line.quantity * line.unit_price, 0);
}

/** True when an edit changed the custom lines: a name, a quantity, a price, or add-on or included. */
export function customLinesChanged(before: CustomLineDraft[] | undefined, after: CustomLineDraft[]): boolean {
  const key = (lines: CustomLineDraft[]) =>
    customLinesForRequest(lines).map((line) => `${line.name}×${line.quantity}@${line.unit_price}${line.is_addon ? '+' : ''}`).join('|');
  return key(before || []) !== key(after);
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

type ItemLine = { item_id: string; quantity: number };

/** True when an edit changed which Items the booking holds, or how many of each. */
export function bookingItemsChanged(before: ItemLine[] | undefined, after: ItemLine[]): boolean {
  const key = (lines: ItemLine[]) =>
    lines
      .filter((line) => line.item_id)
      .map((line) => `${line.item_id}×${line.quantity}`)
      .sort()
      .join(',');
  return key(before || []) !== key(after);
}

/** The share of the booking amount that one more rental day costs, as `LateFeeDayShare` in the backend. */
export const EXTENSION_DAY_SHARE = 0.5;

type ExtensionLine = { kind?: string; total_price?: number; quantity?: number; unit_price?: number };

/** True for the line of one more rental day. Only Extend adds one; Edit keeps it as it is. */
export function isExtensionLine(line: { kind?: string }): boolean {
  return line.kind === 'extension';
}

/** The price of the extra rental days on a booking. */
export function extensionTotal(lines: ExtensionLine[] | undefined): number {
  return (lines || [])
    .filter(isExtensionLine)
    .reduce((sum, line) => sum + (line.total_price ?? (line.quantity || 1) * (line.unit_price || 0)), 0);
}

/**
 * One more rental day: half the booking amount before any extension, so
 * every day costs the same. It mirrors `Booking.ExtensionDayPrice`.
 */
export function extensionDayPrice(finalAmount: number, lines: ExtensionLine[] | undefined): number {
  return Math.round(Math.max(0, finalAmount - extensionTotal(lines)) * EXTENSION_DAY_SHARE);
}

/** The calendar day after an ISO date, as YYYY-MM-DD. */
export function nextDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}
