/**
 * Two Print buttons, four possible routes, picked from the device they were
 * tapped on.
 *
 *   Android   → SuitLabs Print Bridge   receipt + cash drawer, stays in the app
 *   iOS       → Bluetooth Print app     receipt only, no drawer
 *   Desktop   → Web Bluetooth           receipt + cash drawer, only once a
 *                                       printer has been paired in this tab
 *   Desktop   → browser print dialog    always available, whatever printer the
 *                                       computer has, no drawer
 *
 * Print barcode uses the same routes but never opens the drawer — it is a
 * reprint of the bars, not a sale. The desktop routes are ordered deliberately:
 * a paired thermal printer is the better outcome (58 mm paper, no dialog), but
 * it can only exist on a secure origin in a Chromium browser after someone has
 * picked the device. The print dialog is the floor — it needs no setup and no
 * permissions, so the buttons are never a dead end.
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
import { findOpenReceiptNode, printImageDataUrl, printOpenReceiptBarcode, printReceiptNode } from './print-browser';
import { rentalInvoiceNumber, saleInvoiceNumber } from './barcode';
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

export type PrintInvoiceOptions = {
  /** Reprint just the invoice barcode. Never opens the cash drawer. */
  barcodeOnly?: boolean;
};

async function printOnDetectedRoute(args: {
  androidUrl: string;
  iosUrl: string;
  iosAndroidFallbackUrl: string;
  sendThermal: () => Promise<void>;
  openDrawer: boolean;
  browser: () => void;
}): Promise<PrintOutcome> {
  if (isAndroidDevice()) {
    openPrintBridge(args.androidUrl);
    return { route: 'bridge', drawer: args.openDrawer };
  }
  if (isIOSDevice()) {
    openBprint(args.iosUrl, args.iosAndroidFallbackUrl);
    return { route: 'bprint', drawer: false };
  }
  if (hasThermalPrinter()) {
    if (args.openDrawer) {
      await viaThermal(args.sendThermal);
    } else {
      await args.sendThermal();
    }
    return { route: 'thermal', drawer: args.openDrawer };
  }
  args.browser();
  return { route: 'browser', drawer: false };
}

export async function printBookingInvoice(
  invoice: InvoiceData,
  options: PrintInvoiceOptions = {},
): Promise<PrintOutcome> {
  const type = invoice.invoice_type === 'dp' ? 'dp' : 'full';
  const bookingId = invoice.booking_id;
  const barcodeOnly = Boolean(options.barcodeOnly);

  return printOnDetectedRoute({
    androidUrl: getAndroidBridgeBookingInvoiceUrl(bookingId, type, barcodeOnly),
    iosUrl: getBprintBookingInvoiceUrl(bookingId, type, undefined, barcodeOnly),
    iosAndroidFallbackUrl: getAndroidBridgeBookingInvoiceUrl(bookingId, type, barcodeOnly),
    sendThermal: barcodeOnly
      ? () => thermalPrinter.printInvoiceBarcode(invoice.invoice_number)
      : () => thermalPrinter.printBookingInvoice(invoice),
    openDrawer: !barcodeOnly,
    browser: () => {
      if (barcodeOnly) {
        printOpenReceiptBarcode(invoice.invoice_number, `Barcode ${invoice.invoice_number}`);
        return;
      }
      printReceiptNode(findOpenReceiptNode(), `Invoice ${invoice.invoice_number}`);
    },
  });
}

export async function printRentalInvoice(
  rental: Rental,
  options: PrintInvoiceOptions = {},
): Promise<PrintOutcome> {
  const barcodeOnly = Boolean(options.barcodeOnly);
  const invoiceNumber = rentalInvoiceNumber(rental);

  return printOnDetectedRoute({
    androidUrl: getAndroidBridgeRentalInvoiceUrl(rental.id, barcodeOnly),
    iosUrl: getBprintRentalInvoiceUrl(rental.id, undefined, barcodeOnly),
    iosAndroidFallbackUrl: getAndroidBridgeRentalInvoiceUrl(rental.id, barcodeOnly),
    sendThermal: barcodeOnly
      ? () => thermalPrinter.printInvoiceBarcode(invoiceNumber)
      : () => thermalPrinter.printRentalInvoice(rental),
    openDrawer: !barcodeOnly,
    browser: () => {
      if (barcodeOnly) {
        printOpenReceiptBarcode(invoiceNumber, `Barcode ${invoiceNumber}`);
        return;
      }
      printReceiptNode(findOpenReceiptNode(), `Rental ${rental.id.slice(-8)}`);
    },
  });
}

export async function printSaleInvoice(
  sale: Sale,
  options: PrintInvoiceOptions = {},
): Promise<PrintOutcome> {
  const barcodeOnly = Boolean(options.barcodeOnly);
  const invoiceNumber = saleInvoiceNumber(sale);

  return printOnDetectedRoute({
    androidUrl: getAndroidBridgeSaleInvoiceUrl(sale.id, barcodeOnly),
    iosUrl: getBprintSaleInvoiceUrl(sale.id, undefined, barcodeOnly),
    iosAndroidFallbackUrl: getAndroidBridgeSaleInvoiceUrl(sale.id, barcodeOnly),
    sendThermal: barcodeOnly
      ? () => thermalPrinter.printInvoiceBarcode(invoiceNumber)
      : () => thermalPrinter.printSaleInvoice(sale),
    openDrawer: !barcodeOnly,
    browser: () => {
      if (barcodeOnly) {
        printOpenReceiptBarcode(invoiceNumber, `Barcode ${invoiceNumber}`);
        return;
      }
      printReceiptNode(findOpenReceiptNode(), `Sale ${sale.sale_number}`);
    },
  });
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
 * rack. Phones print the printer's own large text and barcode commands so the
 * size and bars stay sharp. Laptops without a paired thermal printer still get
 * the on-screen canvas through the print dialog.
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
  if (!labelImageDataUrl) {
    throw new Error('Label image is not ready yet.');
  }
  printImageDataUrl(labelImageDataUrl, `Label ${item.code}`);
  return { route: 'browser', drawer: false };
}
