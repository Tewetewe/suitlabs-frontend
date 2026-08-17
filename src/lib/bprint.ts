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
const SUITLABS_PRINT_BRIDGE_SCHEME = 'suitlabs-print://print';

export const THERMER_ANDROID_PACKAGE = 'mate.bluetoothprint';
export const PRINT_BRIDGE_ANDROID_PACKAGE = 'com.suitlabs.printbridge';

export function isAndroidDevice(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

export function isIOSDevice(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function buildResponseUrl(path: string, query: string): string {
  return `${getApiBase()}${path}${query}`;
}

function buildIosUrl(path: string, query: string): string {
  return `${IOS_SCHEME}${buildResponseUrl(path, query)}`;
}

function buildAndroidUrl(path: string, query: string): string {
  return `${ANDROID_SCHEME}${buildResponseUrl(path, query)}`;
}

function buildAndroidBridgeUrl(path: string, query: string): string {
  const responseUrl = buildResponseUrl(path, `${query}&format=array`);
  return `${SUITLABS_PRINT_BRIDGE_SCHEME}?url=${encodeURIComponent(responseUrl)}`;
}

export function getAndroidBridgeBookingInvoiceUrl(bookingId: string, type: 'dp' | 'full'): string {
  return buildAndroidBridgeUrl(
    '/api/v1/bprint/booking-invoice',
    `?booking_id=${encodeURIComponent(bookingId)}&type=${encodeURIComponent(type)}`,
  );
}

export function getAndroidBridgeRentalInvoiceUrl(rentalId: string): string {
  return buildAndroidBridgeUrl(
    '/api/v1/bprint/rental-invoice',
    `?rental_id=${encodeURIComponent(rentalId)}`,
  );
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

/**
 * Chrome intercepts intent:// and starts the print app without navigating
 * away from SuitLabs. Custom schemes via location.href replace the page.
 */
export function toAndroidIntentUrl(customUrl: string, packageName: string): string {
  const separator = '://';
  const index = customUrl.indexOf(separator);
  if (index < 0) {
    return customUrl;
  }
  const scheme = customUrl.slice(0, index);
  const rest = customUrl.slice(index + separator.length).replace(/#/g, '%23');
  return `intent://${rest}#Intent;scheme=${scheme};package=${packageName};end`;
}

export function launchPrintUrl(url: string, androidPackage?: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  const isAndroid = /android/i.test(navigator.userAgent);
  const launched = isAndroid && androidPackage ? toAndroidIntentUrl(url, androidPackage) : url;
  // Playwright records launches here; Chromium will not navigate to intent:/bprint: schemes.
  const sink = (window as Window & { __e2ePrintHrefs?: string[] }).__e2ePrintHrefs;
  if (Array.isArray(sink)) {
    sink.push(launched);
  }
  window.location.href = launched;
}

/** Open Thermer / Bluetooth Print without replacing the SuitLabs page on Android. */
export function openBprint(iosUrl: string, androidUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  if (isAndroidDevice()) {
    launchPrintUrl(androidUrl, THERMER_ANDROID_PACKAGE);
    return true;
  }
  if (isIOSDevice()) {
    launchPrintUrl(iosUrl);
    return true;
  }
  return false;
}

/** Open the SuitLabs Print Bridge without replacing the SuitLabs page. */
export function openPrintBridge(url: string): boolean {
  if (typeof window === 'undefined' || !isAndroidDevice()) {
    return false;
  }
  launchPrintUrl(url, PRINT_BRIDGE_ANDROID_PACKAGE);
  return true;
}
