/**
 * How each payment of a Booking reads in its detail view: "DP · Transfer · BCA".
 * The first payment is the DP of a down-payment booking, or its full payment;
 * a later one pays the rest. A DP and the rest may go to different Pots.
 */
import { formatPaymentMethod } from './payment-methods';
import { potLabel } from './pots';

type PaymentLike = { kind: 'payment' | 'refund'; method?: string; pot: string };

export function bookingPaymentLabels(payments: PaymentLike[], bookingMethod?: string | null): string[] {
  const isDownPayment = String(bookingMethod || '').startsWith('dp_');
  let paymentsSeen = 0;
  return payments.map((payment) => {
    let kind: string;
    if (payment.kind === 'refund') {
      kind = 'Refund';
    } else {
      kind = paymentsSeen === 0 ? (isDownPayment ? 'DP' : 'Full payment') : 'Remaining';
      paymentsSeen += 1;
    }
    const pot = payment.pot === 'bca' ? 'BCA' : payment.pot === 'bni' ? 'BNI' : potLabel(payment.pot);
    return [kind, payment.method ? formatPaymentMethod(payment.method) : '', pot].filter(Boolean).join(' · ');
  });
}
