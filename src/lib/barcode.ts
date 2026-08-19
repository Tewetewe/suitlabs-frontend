/** Strip a printed or scanned invoice code to letters+digits, matching CODE128. */
export function invoiceBarcodeValue(invoiceNumber: string): string {
  const value = invoiceNumber.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // 14 chars is the longest CODE128 that still prints at module width 2 on 58mm.
  if (value.startsWith('INV') && value.length > 14) {
    return `INV${value.slice(-8)}`;
  }
  return value;
}

export function looksLikeInvoiceBarcode(code: string): boolean {
  const value = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return value.startsWith('INV') && value.length >= 8;
}

/**
 * Is this the barcode printed on a Sale receipt?
 *
 * A Sale number is `SL-20260819-0001`, printed with the hyphens stripped, so a
 * scan reads back as `SL202608190001`. Booking invoices start with INV, so the
 * two never collide and a scan can be routed without asking.
 */
export function looksLikeSaleBarcode(code: string): boolean {
  const value = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return value.startsWith('SL') && value.length >= 8;
}

/** Any barcode printed on a receipt: a booking invoice or a Sale. */
export function looksLikeReceiptBarcode(code: string): boolean {
  return looksLikeInvoiceBarcode(code) || looksLikeSaleBarcode(code);
}

/** Camera/keyboard scans often wrap the value in quotes or keep hyphens from the HRI text. */
export function cleanScannedCode(raw: string): string {
  return raw.replace(/^\s*["']+|["']+\s*$/g, '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/** Quagga fires on the first low-confidence frame. Require consecutive matching reads. */
export function confirmedScan(recent: readonly string[], minRepeats = 3): string | null {
  if (recent.length < minRepeats) return null;
  const last = recent[recent.length - 1];
  if (!last) return null;
  let n = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i] !== last) break;
    n += 1;
  }
  return n >= minRepeats ? last : null;
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
