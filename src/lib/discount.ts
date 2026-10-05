/**
 * How a discount reads on a form that offers it.
 *
 * The amount follows the same three steps the backend takes in
 * `Discount.CalculateDiscount`: take the percentage or the fixed amount, never
 * take more than the bill, then apply the cap. The form shows what the operator
 * is about to give away before the booking is saved.
 */
import { formatCurrency } from './currency';

/** The fields a picker reads. `Discount` from `@/types` satisfies this. */
export type DiscountLike = {
  name: string;
  discount_type: 'percentage' | 'amount';
  discount_value: number;
  max_discount_amount?: number;
  requires_code?: boolean;
  code?: string;
};

/** What this discount takes off a bill of `total`. */
export function discountAmountFor(discount: DiscountLike, total: number): number {
  if (!(total > 0)) return 0;
  let amount =
    discount.discount_type === 'percentage'
      ? total * (discount.discount_value / 100)
      : discount.discount_value;
  if (amount > total) amount = total;
  const cap = discount.max_discount_amount;
  if (cap != null && cap > 0 && amount > cap) amount = cap;
  return Math.round(amount);
}

/** The rate on its own, for a label: `15%` or `Rp 50.000`. */
export function discountRateLabel(discount: DiscountLike): string {
  return discount.discount_type === 'percentage'
    ? `${discount.discount_value}%`
    : formatCurrency(discount.discount_value);
}

/**
 * One line for a picker option.
 *
 * The saving comes first because that is the number the operator checks. A
 * discount the customer must quote adds its code, so nobody hands out a coupon
 * discount to a walk-in by mistake.
 */
export function discountOptionLabel(discount: DiscountLike, total: number): string {
  const parts = [`${discount.name} — ${discountRateLabel(discount)}`];
  const amount = discountAmountFor(discount, total);
  if (amount > 0) {
    parts.push(`takes off ${formatCurrency(amount)}`);
  }
  if (discount.requires_code && discount.code) {
    parts.push(`needs code ${discount.code}`);
  }
  return parts.join(' · ');
}
