import type { Rental } from '@/types';
import { customLineCharged } from './booking-draft';
import { customerLineName } from './item-name';

export type RentalReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  included: boolean;
};

/** The package, its included Items and its add-ons share one receipt breakdown. */
export function rentalReceiptPricing(rental: Rental) {
  const booking = rental.booking;
  const hasPackage = Boolean(booking?.package_pricing_id);
  const bookingItems = new Map((booking?.items || []).map((item) => [item.item_id, item]));
  const discount = booking?.discount_amount || 0;
  const lines: RentalReceiptItem[] = (rental.items || booking?.items || []).map((item) => {
    const source = bookingItems.get(item.item_id);
    const included = hasPackage && Boolean(source && !source.is_addon);
    const quantity = item.quantity || 1;
    return {
      name: customerLineName(item.item) || 'Item',
      quantity,
      unitPrice: included ? 0 : item.unit_price,
      total: included ? 0 : item.total_price || item.unit_price * quantity,
      included,
    };
  });
  for (const custom of booking?.custom_lines || []) {
    const included = !customLineCharged(custom, hasPackage);
    lines.push({
      name: custom.name,
      quantity: custom.quantity,
      unitPrice: included ? 0 : custom.unit_price,
      total: included ? 0 : custom.total_price ?? custom.quantity * custom.unit_price,
      included,
    });
  }
  let subtotal = lines.reduce((sum, line) => sum + line.total, 0);
  if (hasPackage) {
    // Use the saved amount: editing today's package price must not reprice an old receipt.
    const gross = booking?.total_amount || rental.total_cost + discount;
    const price = Math.max(0, gross - subtotal);
    lines.unshift({
      name: booking?.package_pricing?.package_name?.trim() || 'Suit Rental Package',
      quantity: 1, unitPrice: price, total: price, included: false,
    });
    subtotal += price;
  } else if (lines.length === 0) {
    subtotal = rental.total_cost + discount;
    lines.push({ name: 'Rental Package', quantity: 1, unitPrice: subtotal, total: subtotal, included: false });
  }
  return { lines, subtotal, discount };
}
