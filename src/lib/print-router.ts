/**
 * One Print button, four possible routes, picked from the device it was tapped on.
 *
 *   Android   → SuitLabs Print Bridge   receipt + cash drawer, stays in the app
 *   iOS       → Bluetooth Print app     receipt only, no drawer
 *   Desktop   → Web Bluetooth           receipt + cash drawer, only once a
 *                                       printer has been paired in this tab
 *   Desktop   → browser print dialog    always available, whatever printer the
 *                                       computer has, no drawer
 *
 * The desktop routes are ordered deliberately: a paired thermal printer is the
 * better outcome (58 mm paper, drawer pops, no dialog), but it can only exist
 * on a secure origin in a Chromium browser after someone has picked the device.
 * The print dialog is the floor — it needs no setup and no permissions, so the
 * button is never a dead end.
 */
import type { InvoiceData, Rental, Sale } from '@/types';
import {
  getAndroidBluetoothProductLabelUrl,
  getAndroidBridgeBookingInvoiceUrl,
  getAndroidBridgeProductLabelUrl,
  getAndroidBridgeRentalInvoiceUrl,
  getAndroidBridgeSaleInvoiceUrl,
  getBprintBookingInvoiceUrl,
  getBprintProductLabelUrl,
  getBprintRentalInvoiceUrl,
  getBprintSaleInvoiceUrl,
  isAndroidDevice,
  isIOSDevice,
  openBprint,
  openPrintBridge,
} from './bprint';
import { findOpenReceiptNode, printImageDataUrl, printReceiptNode } from './print-browser';
import { thermalPrinter } from './thermal-printer';

export type PrintRoute = 'bridge' | 'bprint' | 'thermal' | 'browser';

export type PrintOutcome = {
  route: PrintRoute;
  /** Whether the cash drawer was asked to open on this route. */
  drawer: boolean;
};

/**
 * Is a direct Bluetooth printer reachable from this browser at all?
 *
 * Web Bluetooth needs a secure context (HTTPS, or localhost in development).
 * A shop laptop pointed at `http://192.168.x.x:3000` fails this, which is
 * exactly why the browser dialog has to stay as the fallback.
 */
export function canUseThermalPrinter(): boolean {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  return thermalPrinter.isAvailable();
}

/** Is a thermal printer paired and connected right now? */
export function hasThermalPrinter(): boolean {
  return canUseThermalPrinter() && thermalPrinter.isConnected();
}

/** The route this device would take if Print were pressed now. */
export function detectPrintRoute(): PrintRoute {
  if (typeof window === 'undefined') return 'browser';
  if (isAndroidDevice()) return 'bridge';
  if (isIOSDevice()) return 'bprint';
  if (hasThermalPrinter()) return 'thermal';
  return 'browser';
}

/** Plain-language description of what the Print button will do, for the UI. */
export function describePrintRoute(route: PrintRoute = detectPrintRoute()): string {
  switch (route) {
    case 'bridge':
      return 'Prints through the SuitLabs Print Bridge and opens the cash drawer.';
    case 'bprint':
      return 'Opens the Bluetooth Print app. The cash drawer stays shut.';
    case 'thermal':
      return `Prints straight to ${thermalPrinter.getDeviceName()} and opens the cash drawer.`;
    case 'browser':
      return 'Opens your print dialog with the 58 mm receipt.';
  }
}

/**
 * Pair a thermal printer with this browser.
 *
 * Must be called from a click — Web Bluetooth will not show its device picker
 * without a user gesture. Once paired, `detectPrintRoute` upgrades this tab to
 * the `thermal` route on its own.
 */
export async function connectThermalPrinter(): Promise<string> {
  await thermalPrinter.connect();
  return thermalPrinter.getDeviceName();
}

export async function disconnectThermalPrinter(): Promise<void> {
  await thermalPrinter.disconnect();
}

async function viaThermal(send: () => Promise<void>): Promise<boolean> {
  try {
    await thermalPrinter.openCashDrawer();
  } catch {
    // A missing or unsupported drawer must never hold up the receipt — the
    // same rule the Android bridge follows.
  }
  await send();
  return true;
}

export async function printBookingInvoice(invoice: InvoiceData): Promise<PrintOutcome> {
  const type = invoice.invoice_type === 'dp' ? 'dp' : 'full';
  const bookingId = invoice.booking_id;

  if (isAndroidDevice()) {
    openPrintBridge(getAndroidBridgeBookingInvoiceUrl(bookingId, type));
    return { route: 'bridge', drawer: true };
  }
  if (isIOSDevice()) {
    openBprint(
      getBprintBookingInvoiceUrl(bookingId, type),
      getAndroidBridgeBookingInvoiceUrl(bookingId, type),
    );
    return { route: 'bprint', drawer: false };
  }
  if (hasThermalPrinter()) {
    await viaThermal(() => thermalPrinter.printBookingInvoice(invoice));
    return { route: 'thermal', drawer: true };
  }

  printReceiptNode(findOpenReceiptNode(), `Invoice ${invoice.invoice_number}`);
  return { route: 'browser', drawer: false };
}

export async function printRentalInvoice(rental: Rental): Promise<PrintOutcome> {
  if (isAndroidDevice()) {
    openPrintBridge(getAndroidBridgeRentalInvoiceUrl(rental.id));
    return { route: 'bridge', drawer: true };
  }
  if (isIOSDevice()) {
    openBprint(getBprintRentalInvoiceUrl(rental.id), getAndroidBridgeRentalInvoiceUrl(rental.id));
    return { route: 'bprint', drawer: false };
  }
  if (hasThermalPrinter()) {
    await viaThermal(() => thermalPrinter.printRentalInvoice(rental));
    return { route: 'thermal', drawer: true };
  }

  printReceiptNode(findOpenReceiptNode(), `Rental ${rental.id.slice(-8)}`);
  return { route: 'browser', drawer: false };
}

export async function printSaleInvoice(sale: Sale): Promise<PrintOutcome> {
  if (isAndroidDevice()) {
    openPrintBridge(getAndroidBridgeSaleInvoiceUrl(sale.id));
    return { route: 'bridge', drawer: true };
  }
  if (isIOSDevice()) {
    openBprint(getBprintSaleInvoiceUrl(sale.id), getAndroidBridgeSaleInvoiceUrl(sale.id));
    return { route: 'bprint', drawer: false };
  }
  if (hasThermalPrinter()) {
    await viaThermal(() => thermalPrinter.printSaleInvoice(sale));
    return { route: 'thermal', drawer: true };
  }

  printReceiptNode(findOpenReceiptNode(), `Sale ${sale.sale_number}`);
  return { route: 'browser', drawer: false };
}

export type LabelItem = {
  id: string;
  name: string;
  code: string;
  barcode: string;
  brand?: string;
  color?: string;
  size?: { label?: string };
};

/**
 * Barcode labels never open the drawer on any route — they are stock labels,
 * not a sale, and the counter drawer should not pop while someone re-labels a
 * rack. Android uses the Print Bridge without a drawer kick; iPhone still uses
 * Bluetooth Print.
 */
export async function printProductLabel(
  item: LabelItem,
  labelImageDataUrl?: string,
): Promise<PrintOutcome> {
  if (isAndroidDevice()) {
    openPrintBridge(getAndroidBridgeProductLabelUrl(item.id));
    return { route: 'bridge', drawer: false };
  }
  if (isIOSDevice()) {
    openBprint(getBprintProductLabelUrl(item.id), getAndroidBluetoothProductLabelUrl(item.id));
    return { route: 'bprint', drawer: false };
  }
  if (hasThermalPrinter()) {
    await thermalPrinter.printProductLabel(item);
    return { route: 'thermal', drawer: false };
  }
  printImageDataUrl(labelImageDataUrl || '', `Label ${item.code}`);
  return { route: 'browser', drawer: false };
}
