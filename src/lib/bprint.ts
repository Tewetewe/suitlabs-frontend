/**
 * Bluetooth Print app (bprint://) URL helpers
 * App: https://apps.apple.com/us/app/id1599863946
 * Enable "Browser Print" in the app, then open bprint://<response_url> from Safari.
 * The app fetches the response URL and prints the JSON array.
 */

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081').replace(/\/$/, '');
}

export function getBprintBookingInvoiceUrl(bookingId: string, type: 'dp' | 'full'): string {
  const base = getApiBase();
  return `bprint://${base}/api/v1/bprint/booking-invoice?booking_id=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}`;
}

export function getBprintRentalInvoiceUrl(rentalId: string): string {
  const base = getApiBase();
  return `bprint://${base}/api/v1/bprint/rental-invoice?rental_id=${encodeURIComponent(rentalId)}`;
}

export function getBprintProductLabelUrl(itemId: string): string {
  const base = getApiBase();
  return `bprint://${base}/api/v1/bprint/product-label?item_id=${encodeURIComponent(itemId)}`;
}
