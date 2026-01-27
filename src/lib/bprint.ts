/**
 * Bluetooth Print app URL helpers.
 * - iOS app store: https://apps.apple.com/us/app/id1599863946 (scheme: bprint://)
 * - Android app: https://play.google.com/store/apps/details?id=mate.bluetoothprint (scheme: my.bluetoothprint.scheme://)
 * Enable "Browser Print" in the app, then open <scheme><response_url>; the app fetches the response URL and prints the JSON array.
 */

function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081').replace(/\/$/, '');
}

const IOS_SCHEME = 'bprint://';
const ANDROID_SCHEME = 'my.bluetoothprint.scheme://';

function buildResponseUrl(path: string, query: string): string {
  return `${getApiBase()}${path}${query}`;
}

function buildIosUrl(path: string, query: string): string {
  return `${IOS_SCHEME}${buildResponseUrl(path, query)}`;
}

function buildAndroidUrl(path: string, query: string): string {
  return `${ANDROID_SCHEME}${buildResponseUrl(path, query)}`;
}

export function getBprintBookingInvoiceUrl(bookingId: string, type: 'dp' | 'full', format?: 'entries' | 'object' | 'array'): string {
  const fmt = format ? `&format=${format}` : '';
  return buildIosUrl('/api/v1/bprint/booking-invoice', `?booking_id=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}${fmt}`);
}

export function getBprintRentalInvoiceUrl(rentalId: string, format?: 'entries' | 'object' | 'array'): string {
  const fmt = format ? `&format=${format}` : '';
  return buildIosUrl('/api/v1/bprint/rental-invoice', `?rental_id=${encodeURIComponent(rentalId)}${fmt}`);
}

export function getBprintProductLabelUrl(itemId: string, format?: 'entries' | 'object' | 'array'): string {
  const fmt = format ? `&format=${format}` : '';
  return buildIosUrl('/api/v1/bprint/product-label', `?item_id=${encodeURIComponent(itemId)}${fmt}`);
}

export function getAndroidBluetoothBookingInvoiceUrl(bookingId: string, type: 'dp' | 'full', format?: 'entries' | 'object' | 'array'): string {
  const fmt = format ? `&format=${format}` : '';
  return buildAndroidUrl('/api/v1/bprint/booking-invoice', `?booking_id=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}${fmt}`);
}

export function getAndroidBluetoothRentalInvoiceUrl(rentalId: string, format?: 'entries' | 'object' | 'array'): string {
  const fmt = format ? `&format=${format}` : '';
  return buildAndroidUrl('/api/v1/bprint/rental-invoice', `?rental_id=${encodeURIComponent(rentalId)}${fmt}`);
}

export function getAndroidBluetoothProductLabelUrl(itemId: string, format?: 'entries' | 'object' | 'array'): string {
  const fmt = format ? `&format=${format}` : '';
  return buildAndroidUrl('/api/v1/bprint/product-label', `?item_id=${encodeURIComponent(itemId)}${fmt}`);
}
