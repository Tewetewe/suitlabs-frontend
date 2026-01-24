/**
 * Bluetooth Print app (bprint://) URL helpers
 * App: https://apps.apple.com/us/app/id1599863946
 * Enable "Browser Print" in Thermer: one tap in our app opens Thermer, fetches the URL, and prints.
 * No need to press anything in Thermer. &auto=1 can signal auto-print (if the app supports it).
 */

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081').replace(/\/$/, '');
}

const AUTO = '&auto=1';

export function getBprintBookingInvoiceUrl(bookingId: string, type: 'dp' | 'full'): string {
  const base = getApiBase();
  return `bprint://${base}/api/v1/bprint/booking-invoice?booking_id=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}${AUTO}`;
}

export function getBprintRentalInvoiceUrl(rentalId: string): string {
  const base = getApiBase();
  return `bprint://${base}/api/v1/bprint/rental-invoice?rental_id=${encodeURIComponent(rentalId)}${AUTO}`;
}

export function getBprintProductLabelUrl(itemId: string): string {
  const base = getApiBase();
  return `bprint://${base}/api/v1/bprint/product-label?item_id=${encodeURIComponent(itemId)}${AUTO}`;
}
