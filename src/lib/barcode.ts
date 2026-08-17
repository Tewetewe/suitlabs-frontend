/** Strip a printed or scanned invoice code to letters+digits, matching CODE128. */
export function invoiceBarcodeValue(invoiceNumber: string): string {
  return invoiceNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export function looksLikeInvoiceBarcode(code: string): boolean {
  const value = invoiceBarcodeValue(code);
  return value.startsWith('INV') && value.length >= 8;
}

export function rentalInvoiceNumber(rental: {
  id: string;
  booking?: { invoice_number?: string } | null;
}): string {
  return rental.booking?.invoice_number || `INV-${rental.id.slice(-8).toUpperCase()}`;
}

export function saleInvoiceNumber(sale: { id: string; sale_number?: string }): string {
  return sale.sale_number || `INV-${sale.id.slice(-8).toUpperCase()}`;
}
