import { apiClient } from '@/lib/api';
import type { InvoiceData } from '@/types';

export function invoiceTypeForReceivedPayment(
  paymentStatus: string,
  paidAmount: number,
): 'dp' | 'full' | null {
  if (!(paidAmount > 0)) return null;
  return paymentStatus === 'completed' ? 'full' : 'dp';
}

export async function issueBookingInvoice(booking: {
  id: string;
  payment_status: string;
  paid_amount?: number;
}): Promise<InvoiceData | null> {
  const type = invoiceTypeForReceivedPayment(booking.payment_status, booking.paid_amount || 0);
  if (!type) return null;
  const invoice = await apiClient.generateInvoice(booking.id, type);
  if (invoice && (!invoice.items || !Array.isArray(invoice.items))) {
    invoice.items = [];
  }
  return invoice;
}
