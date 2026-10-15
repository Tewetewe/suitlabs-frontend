/**
 * The totals block of a Booking or Sale receipt, in print order. The invoice
 * modals, the WhatsApp image, and the ESC/POS print all use it, and the
 * backend print (bprint_handlers.go) keeps the same order:
 *
 *   Subtotal
 *   Discount          (only with a discount)
 *   From deposit      (only when the Security Deposit paid part of a Sale)
 *   Transaction fee   (only with a fee)
 *   TOTAL PAID        (bold: the money paid now, fee included)
 *   Remaining         (only while money is still owed, as after a DP)
 */

import { TRANSACTION_FEE_LABEL } from './transaction-fee';

export type ReceiptTotalLine = {
  label: string;
  amount: number;
  /** discount prints as (amount); total prints bold. */
  kind: 'line' | 'discount' | 'total';
};

export function receiptTotals(input: {
  subtotal: number;
  discount?: number;
  fee?: number;
  /** Paid toward the price, fee not included. */
  paid: number;
  /** The price after the discount. */
  owed: number;
  /** The part of `paid` the Security Deposit covered. */
  fromDeposit?: number;
}): ReceiptTotalLine[] {
  const discount = input.discount || 0;
  const fee = input.fee || 0;
  const fromDeposit = input.fromDeposit || 0;
  const lines: ReceiptTotalLine[] = [{ label: 'Subtotal', amount: input.subtotal, kind: 'line' }];
  if (discount > 0) lines.push({ label: 'Discount', amount: discount, kind: 'discount' });
  if (fromDeposit > 0) lines.push({ label: 'From deposit', amount: fromDeposit, kind: 'discount' });
  if (fee > 0) lines.push({ label: TRANSACTION_FEE_LABEL, amount: fee, kind: 'line' });
  lines.push({ label: 'TOTAL PAID', amount: input.paid - fromDeposit + fee, kind: 'total' });
  const remaining = input.owed - input.paid;
  if (remaining > 0.009) lines.push({ label: 'Remaining', amount: remaining, kind: 'line' });
  return lines;
}
