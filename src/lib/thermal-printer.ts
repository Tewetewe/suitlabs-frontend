/**
 * Thermal Printer Service
 * Handles Bluetooth and USB connection to thermal printers
 */

import { ESCPOSGenerator, formatCurrencyForPrint, formatDateForPrint, formatDateTimeForPrint } from './escpos';
import { InvoiceData, Rental, Sale } from '@/types';
import { invoiceBarcodeValue, rentalInvoiceNumber, saleInvoiceNumber } from './barcode';

// Bluetooth Service UUIDs for common thermal printers
// All must be declared in optionalServices for Web Bluetooth to allow access
const THERMAL_PRINTER_SERVICE_UUIDS = [
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / common BLE printers (GOOJPRT, Bixolon BLE)
  '0000fff0-0000-1000-8000-00805f9b34fb', // FFF0 service (Xprinter, many Chinese BLE printers)
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // ESC/POS BLE (Epson)
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC / Microchip BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '000018f0-0000-1000-8000-00805f9b34fb', // 18F0 (Star Micronics BLE)
];

/** ESC p 0 50 100 — drawer pin 2, 100 ms on, 200 ms off. Matches the Android bridge. */
const DRAWER_KICK = new Uint8Array([0x1b, 0x70, 0x00, 50, 100]);
const DRAWER_KICK_DEBOUNCE_MS = 1000;
const DRAWER_SETTLE_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ThermalPrinterDevice {
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

function appendInvoiceBarcode(generator: ESCPOSGenerator, invoiceNumber: string): void {
  const barcodeData = invoiceBarcodeValue(invoiceNumber);
  if (!barcodeData) {
    return;
  }
  try {
    generator
      .setAlign('center')
      .barcode(barcodeData, 'CODE128', { height: 120, width: 2, hri: false });
  } catch (error) {
    console.warn('Failed to print invoice barcode:', error);
  }
}

export class ThermalPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private lastDrawerKickAt = 0;

  /**
   * Check if Web Bluetooth API is available
   */
  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Connect to Bluetooth printer
   */
  async connect(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera.');
    }

    try {
      // Request Bluetooth device. Always use acceptAllDevices with all known service UUIDs
      // in optionalServices — this is required by Web Bluetooth to permit GATT service access.
      // Filtering by service UUID often fails because many BLE printers don't advertise their
      // service UUID in scan responses.
      this.device = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: THERMAL_PRINTER_SERVICE_UUIDS,
      });

      if (!this.device.gatt) {
        throw new Error('Device does not support GATT');
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Try each known service UUID until one works
      let service: BluetoothRemoteGATTService | null = null;
      for (const uuid of THERMAL_PRINTER_SERVICE_UUIDS) {
        try {
          service = await this.server.getPrimaryService(uuid);
          break;
        } catch {
          continue;
        }
      }

      // Fallback: scan all returned services for any writable characteristic
      if (!service) {
        const services = await this.server.getPrimaryServices();
        for (const svc of services) {
          try {
            const chars = await svc.getCharacteristics();
            const writableChar = chars.find(
              (char: BluetoothRemoteGATTCharacteristic) => char.properties.write || char.properties.writeWithoutResponse
            );
            if (writableChar) {
              service = svc;
              break;
            }
          } catch {
            continue;
          }
        }
      }

      if (!service) {
        throw new Error('No suitable service found. Make sure your printer supports Bluetooth Serial Port Profile.');
      }

      // Get the characteristic for writing
      const characteristics = await service.getCharacteristics();
      this.characteristic = characteristics.find(
        (char: BluetoothRemoteGATTCharacteristic) => char.properties.write || char.properties.writeWithoutResponse
      ) || characteristics[0];

      if (!this.characteristic) {
        throw new Error('No writable characteristic found');
      }
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'NotFoundError') {
        throw new Error('No Bluetooth device selected or device not found. Make sure your printer is powered on and in pairing mode.');
      } else if (err.name === 'SecurityError') {
        throw new Error('Bluetooth permission denied. Please allow Bluetooth access in your browser settings.');
      } else if (err.name === 'NetworkError') {
        throw new Error('Failed to connect to printer. Make sure it is powered on, in range, and not connected to another device.');
      } else if (err.message) {
        throw new Error(err.message);
      } else {
        throw new Error(`Connection failed: ${err.message || 'Unknown error'}`);
      }
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = null;
    this.server = null;
    this.characteristic = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    try {
      return this.device?.gatt?.connected || false;
    } catch {
      return false;
    }
  }

  /**
   * Get connection status details
   */
  getConnectionStatus(): {
    connected: boolean;
    deviceName: string | null;
    hasDevice: boolean;
    hasGatt: boolean;
    hasCharacteristic: boolean;
  } {
    return {
      connected: this.isConnected(),
      deviceName: this.device?.name || null,
      hasDevice: !!this.device,
      hasGatt: !!this.device?.gatt,
      hasCharacteristic: !!this.characteristic,
    };
  }

  /**
   * Test printer connection with a simple print
   */
  async testPrint(): Promise<void> {
    const generator = new ESCPOSGenerator();
    generator
      .initialize()
      .setAlign('center')
      .setFontSize(2, 2)
      .setBold(true)
      .text('TEST PRINT')
      .lineFeed(2)
      .setFontSize(1, 1)
      .setBold(false)
      .text('If you can see this,')
      .lineFeed()
      .text('your printer is working!')
      .lineFeed(3)
      .cut();

    await this.print(generator.getBytes());
  }

  /**
   * Get device name
   */
  getDeviceName(): string {
    return this.device?.name || 'Unknown Device';
  }

  /**
   * Pop the cash drawer wired to the printer's DK port.
   *
   * Byte-for-byte the pulse the Android Print Bridge sends (ReceiptPrinter.java:
   * DRAWER_KICK) — pin 2, 100 ms on, 200 ms off — so a drawer that works at the
   * counter tablet works the same from a laptop. The 1 s debounce is the same
   * guard: two kicks in quick succession can stall the solenoid.
   */
  async openCashDrawer(): Promise<void> {
    const elapsed = Date.now() - this.lastDrawerKickAt;
    if (elapsed < DRAWER_KICK_DEBOUNCE_MS) {
      await delay(DRAWER_KICK_DEBOUNCE_MS - elapsed);
    }
    await this.print(DRAWER_KICK);
    this.lastDrawerKickAt = Date.now();
    await delay(DRAWER_SETTLE_MS);
  }

  /**
   * Send ESC/POS commands to printer
   */
  async print(commands: Uint8Array): Promise<void> {
    // Check connection status
    if (!this.device) {
      throw new Error('No printer device selected. Please connect to a printer first.');
    }

    // Check if GATT is connected
    if (!this.device.gatt) {
      throw new Error('Device does not support GATT. Please reconnect.');
    }

    // Try to reconnect if disconnected
    if (!this.device.gatt.connected) {
      console.log('Device disconnected, attempting to reconnect...');
      try {
        this.server = await this.device.gatt.connect();
        // Re-establish service by trying each known UUID
        let reconnectService: BluetoothRemoteGATTService | null = null;
        for (const uuid of THERMAL_PRINTER_SERVICE_UUIDS) {
          try {
            reconnectService = await this.server.getPrimaryService(uuid);
            break;
          } catch {
            continue;
          }
        }
        if (!reconnectService) {
          throw new Error('Could not re-establish printer service after reconnect.');
        }
        const characteristics = await reconnectService.getCharacteristics();
        this.characteristic = characteristics.find(
          (char: BluetoothRemoteGATTCharacteristic) => char.properties.write || char.properties.writeWithoutResponse
        ) || characteristics[0];
      } catch (reconnectError: unknown) {
        const err = reconnectError as { message?: string };
        throw new Error(`Connection lost. Please reconnect: ${err.message || 'Unknown error'}`);
      }
    }

    if (!this.characteristic) {
      throw new Error('No characteristic available for writing. Please reconnect.');
    }

    try {
      console.log(`Sending ${commands.length} bytes to printer...`);
      
      // Split data into chunks of 20 bytes (BLE MTU limit)
      const chunkSize = 20;
      let totalSent = 0;
      
      for (let i = 0; i < commands.length; i += chunkSize) {
        const chunk = commands.slice(i, i + chunkSize);
        totalSent += chunk.length;
        
        try {
          if (this.characteristic.properties.writeWithoutResponse) {
            await this.characteristic.writeValueWithoutResponse(chunk);
          } else if (this.characteristic.properties.write) {
            await this.characteristic.writeValue(chunk);
          } else {
            throw new Error('Characteristic does not support writing');
          }
        } catch (writeError: unknown) {
          // Check if connection was lost during write
          if (!this.device.gatt?.connected) {
            throw new Error('Connection lost during printing. Please reconnect and try again.');
          }
          const err = writeError as { message?: string };
          throw new Error(`Failed to write data: ${err.message || 'Unknown error'}`);
        }

        // Small delay between chunks to avoid overwhelming the printer
        if (i + chunkSize < commands.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      console.log(`Successfully sent ${totalSent} bytes to printer`);
      
      // Add a small delay at the end to ensure all data is processed
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: unknown) {
      console.error('Print error:', error);
      const err = error as { message?: string };
      throw new Error(`Print failed: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Print booking invoice
   */
  async printBookingInvoice(invoice: InvoiceData): Promise<void> {
    const generator = new ESCPOSGenerator();

    // Initialize printer
    generator.initialize();

    // Company Header
    generator
      .setAlign('center')
      .setFontSize(2, 2)
      .setBold(true)
      .text('SUITLABS BALI')
      .lineFeed()
      .setFontSize(1, 1)
      .setBold(false)
      .text(invoice.company?.subtitle || 'Sewa Jas Jimbaran')
      .lineFeed(2);

    // Company Info (optimized for 58mm paper width)
    generator
      .setFontSize(1, 1)
      .text(invoice.company?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kabupaten Badung, Bali 80362')
      .lineFeed();
    
    if (invoice.company?.phone) {
      generator.text(`TEL: ${invoice.company.phone}`).lineFeed();
    }
    if (invoice.company?.email) {
      generator.text(`Email: ${invoice.company.email}`).lineFeed();
    }
    
    generator.lineFeed();

    // Separator
    generator.separator();

    // Invoice Info
    generator
      .setAlign('left')
      .setFontSize(1, 1)
      .text(`Invoice: ${invoice.invoice_number}`)
      .lineFeed()
      .text(`Date: ${formatDateTimeForPrint(new Date())}`)
      .lineFeed()
      .text(`Booking ID: ${invoice.booking_id.slice(-8)}`)
      .lineFeed()
      .text(`Type: ${invoice.invoice_type?.toUpperCase() || 'FULL'}`)
      .lineFeed();

    if (invoice.due_date) {
      generator.text(`Due Date: ${formatDateForPrint(invoice.due_date)}`).lineFeed();
    }

    generator.lineFeed();
    generator.separator();

    // Customer Info
    generator
      .setBold(true)
      .text('CUSTOMER:')
      .lineFeed()
      .setBold(false)
      .text(invoice.customer_name)
      .lineFeed();

    generator.separator();

    generator
      .setBold(true)
      .text('ITEMS:')
      .lineFeed()
      .setBold(false);

    if (invoice.items && invoice.items.length > 0) {
      const isPackagePricing =
        invoice.items.every((item) => (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) &&
        (invoice.total_amount || 0) > 0;

      invoice.items.forEach((item) => {
        if ((item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
          generator.text(`  ${item.description}`).lineFeed();
        } else {
          generator
            .text(`  ${item.description}`)
            .lineFeed()
            .text(
              `    ${item.quantity} x ${formatCurrencyForPrint(item.unit_price || 0)} = ${formatCurrencyForPrint(item.total || 0)}`
            )
            .lineFeed();
        }
      });

      if (isPackagePricing) {
        generator.text(`Package: ${formatCurrencyForPrint(invoice.total_amount || 0)}`).lineFeed();
      }
    } else {
      generator.text(invoice.product_name || 'Booking Package').lineFeed();
    }

    generator.separator();
    generator.text(`Subtotal: ${formatCurrencyForPrint(invoice.total_amount || 0)}`).lineFeed();
    if ((invoice.discount_amount || 0) > 0) {
      generator.text(`Discount: (${formatCurrencyForPrint(invoice.discount_amount || 0)})`).lineFeed();
    }
    generator
      .setBold(true)
      .text(`TOTAL: ${formatCurrencyForPrint(invoice.final_amount || invoice.total_amount || 0)}`)
      .lineFeed()
      .setBold(false);

    if (invoice.invoice_type === 'dp') {
      generator
        .text(`DP: ${formatCurrencyForPrint(invoice.due_amount || 0)}`)
        .lineFeed()
        .text(
          `Remaining: ${formatCurrencyForPrint(
            (invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0)
          )}`
        )
        .lineFeed();
    } else {
      generator.text(`Due: ${formatCurrencyForPrint(invoice.due_amount || 0)}`).lineFeed();
    }

    generator.separator();
    generator
      .setAlign('center')
      .text('Thank you for using SuitLabs!')
      .lineFeed()
      .text('suitlabs.bali')
      .lineFeed();
    appendInvoiceBarcode(generator, invoice.invoice_number);
    generator.lineFeed(3);

    generator.cut();
    await this.print(generator.getBytes());
  }

  /**
   * Print rental invoice
   */
  async printRentalInvoice(rental: Rental): Promise<void> {
    const generator = new ESCPOSGenerator();
    const invoiceNumber = rentalInvoiceNumber(rental);
    const shopSubtitle = rental.branch?.receipt_subtitle || 'Sewa Jas Jimbaran';
    const shopAddress = rental.branch?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kab. Badung, Bali 80362';

    // Initialize printer
    generator.initialize();

    // Company Header
    generator
      .setAlign('center')
      .setFontSize(2, 2)
      .setBold(true)
      .text('SUITLABS BALI')
      .lineFeed()
      .setFontSize(1, 1)
      .setBold(false)
      .text(shopSubtitle)
      .lineFeed(2);

    // Company Info (optimized for 58mm paper width)
    generator
      .setFontSize(1, 1)
      .text(shopAddress)
      .lineFeed(2);

    // Separator
    generator.separator();

    // Invoice Info
    generator
      .setAlign('left')
      .setFontSize(1, 1)
      .text(`Invoice: ${invoiceNumber}`)
      .lineFeed()
      .text(`Date: ${formatDateTimeForPrint(new Date())}`)
      .lineFeed()
      .text(`Rental ID: ${rental.id.slice(-8)}`)
      .lineFeed()
      .text(`Status: ${rental.status.toUpperCase()}`)
      .lineFeed();

    generator.separator();

    generator
      .setAlign('left')
      .setBold(true)
      .text('CUSTOMER:')
      .lineFeed()
      .setBold(false)
      .text(
        rental.customer
          ? `${rental.customer.first_name} ${rental.customer.last_name}`.trim()
          : '-'
      )
      .lineFeed();

    const items = (rental.items || rental.booking?.items || []) as Array<{
      item?: { name?: string; size?: { label?: string } };
      quantity: number;
      unit_price: number;
      total_price: number;
      discount_amount?: number;
    }>;
    const itemsSubtotal = items.reduce(
      (sum, item) => sum + (item.total_price || (item.unit_price || 0) * (item.quantity || 1)),
      0
    );
    const itemsDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);
    const refundableDeposit = Math.max((rental.security_deposit || 0) - (rental.damage_charges || 0), 0);

    generator.separator();
    generator
      .setAlign('left')
      .text(`Rental: ${formatDateForPrint(rental.rental_date)}`)
      .lineFeed()
      .text(`Return: ${formatDateForPrint(rental.return_date)}`)
      .lineFeed();

    generator.separator();
    generator.setBold(true).text('ITEMS:').lineFeed().setBold(false);

    if (items.length > 0) {
      items.forEach((item) => {
        const itemName = item.item?.name || 'Item';
        const itemSize = item.item?.size?.label || '';
        const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || item.total_price || 0;
        const itemTotal = item.total_price || unitPrice * quantity;
        generator.text(`  ${description}`).lineFeed();
        generator
          .text(`    ${quantity} x ${formatCurrencyForPrint(unitPrice)} = ${formatCurrencyForPrint(itemTotal)}`)
          .lineFeed();
      });
    } else {
      generator.text('Rental Package').lineFeed();
    }

    generator.separator();
    generator.text(`Subtotal: ${formatCurrencyForPrint(itemsSubtotal || rental.total_cost || 0)}`).lineFeed();
    if (itemsDiscount > 0) {
      generator.text(`Discount: (${formatCurrencyForPrint(itemsDiscount)})`).lineFeed();
    }
    if ((rental.late_fee || 0) > 0) {
      generator.text(`Late Fee: ${formatCurrencyForPrint(rental.late_fee)}`).lineFeed();
    }
    if ((rental.damage_charges || 0) > 0) {
      generator.text(`Damage: ${formatCurrencyForPrint(rental.damage_charges)}`).lineFeed();
    }
    generator.setBold(true).text(`GRAND TOTAL: ${formatCurrencyForPrint(total)}`).lineFeed().setBold(false);

    if ((rental.security_deposit || 0) > 0) {
      generator.text(`Deposit: ${formatCurrencyForPrint(rental.security_deposit)}`).lineFeed();
      if ((rental.damage_charges || 0) > 0) {
        generator.text(`Deduction: (${formatCurrencyForPrint(rental.damage_charges)})`).lineFeed();
      }
      generator.text(`Refundable: ${formatCurrencyForPrint(refundableDeposit)}`).lineFeed();
    }

    if (rental.actual_pickup_date || rental.actual_return_date) {
      generator.separator();
      if (rental.actual_pickup_date) {
        generator.text(`Pickup: ${formatDateForPrint(rental.actual_pickup_date)}`).lineFeed();
      }
      if (rental.actual_return_date) {
        generator.text(`Returned: ${formatDateForPrint(rental.actual_return_date)}`).lineFeed();
      }
    }

    if (rental.notes) {
      generator.separator();
      generator.setBold(true).text('NOTE:').lineFeed().setBold(false).text(rental.notes).lineFeed();
    }

    generator.separator();
    generator
      .setAlign('center')
      .text('Thank you for using SuitLabs!')
      .lineFeed()
      .text('suitlabs.bali')
      .lineFeed();
    appendInvoiceBarcode(generator, invoiceNumber);
    generator.lineFeed(3);

    generator.cut();
    await this.print(generator.getBytes());
  }

  async printSaleInvoice(sale: Sale): Promise<void> {
    const generator = new ESCPOSGenerator();
    const invoiceNumber = saleInvoiceNumber(sale);
    const shopSubtitle = sale.branch?.receipt_subtitle || 'Sewa Jas Jimbaran';
    const shopAddress = sale.branch?.address || 'Jl. Taman Kebo Iwa No.1D, Benoa, Kec. Kuta Sel., Kab. Badung, Bali 80362';
    const customerName = sale.customer
      ? `${sale.customer.first_name} ${sale.customer.last_name}`.trim() || 'Walk-in'
      : 'Walk-in';

    generator.initialize();
    generator
      .setAlign('center')
      .setFontSize(2, 2)
      .setBold(true)
      .text('SUITLABS BALI')
      .lineFeed()
      .setFontSize(1, 1)
      .setBold(false)
      .text(shopSubtitle)
      .lineFeed(2);

    generator
      .setFontSize(1, 1)
      .text(shopAddress)
      .lineFeed(2);

    generator.separator();
    generator
      .setAlign('left')
      .setFontSize(1, 1)
      .text(`Invoice: ${invoiceNumber}`)
      .lineFeed()
      .text(`Date: ${formatDateTimeForPrint(new Date())}`)
      .lineFeed()
      .text(`Sale: ${invoiceNumber}`)
      .lineFeed()
      .text(`Status: ${(sale.status || 'completed').toUpperCase()}`)
      .lineFeed();

    generator.separator();
    generator
      .setAlign('left')
      .setBold(true)
      .text('CUSTOMER:')
      .lineFeed()
      .setBold(false)
      .text(customerName)
      .lineFeed();

    generator.separator();
    generator.setBold(true).text('ITEMS:').lineFeed().setBold(false);

    const saleItems = sale.items || [];
    if (saleItems.length > 0) {
      saleItems.forEach((line) => {
        const name = line.item?.name || 'Item';
        const size = line.item?.size?.label ? ` - ${line.item.size.label}` : '';
        generator.text(`  ${name}${size}`).lineFeed();
        generator
          .text(
            `    ${line.quantity} x ${formatCurrencyForPrint(line.unit_price || 0)} = ${formatCurrencyForPrint(line.line_total || 0)}`
          )
          .lineFeed();
      });
    } else {
      generator.text('Sale').lineFeed();
    }

    generator.separator();
    generator.text(`Subtotal: ${formatCurrencyForPrint(sale.subtotal || 0)}`).lineFeed();
    if ((sale.discount_amount || 0) > 0) {
      generator.text(`Discount: (${formatCurrencyForPrint(sale.discount_amount || 0)})`).lineFeed();
    }
    generator.setBold(true).text(`TOTAL: ${formatCurrencyForPrint(sale.total_amount || 0)}`).lineFeed().setBold(false);
    generator.text(`Paid: ${formatCurrencyForPrint(sale.paid_amount || 0)}`).lineFeed();

    generator.separator();
    generator
      .setAlign('center')
      .text('Thank you for using SuitLabs!')
      .lineFeed()
      .text('suitlabs.bali')
      .lineFeed();
    appendInvoiceBarcode(generator, invoiceNumber);
    generator.lineFeed(3);

    generator.cut();
    await this.print(generator.getBytes());
  }

  /**
   * Print product/item label with barcode (simple label only)
   */
  async printProductLabel(item: {
    name: string;
    code: string;
    barcode: string;
    brand?: string;
    color?: string;
    size?: { label?: string };
  }): Promise<void> {
    const generator = new ESCPOSGenerator();

    // Initialize printer
    generator.initialize();

    // Item Name (centered, bold, larger font)
    generator
      .setAlign('center')
      .setFontSize(1, 1)
      .setBold(true)
      .text(item.name)
      .lineFeed()
      .setBold(false);

    if (item.size?.label) {
      generator
        .setBold(true)
        .setFontSize(2, 2)
        .text(item.size.label)
        .lineFeed()
        .setFontSize(1, 1)
        .setBold(false);
    }

    generator.text(`#${item.code}`).lineFeed();

    const extras: string[] = [];
    if (item.brand) extras.push(item.brand);
    if (item.color) extras.push(item.color);
    if (extras.length > 0) {
      generator.text(extras.join(' • ')).lineFeed();
    }

    generator.lineFeed();

    try {
      const barcodeData = item.barcode.replace(/[^A-Za-z0-9]/g, '');
      if (barcodeData.length > 0) {
        generator
          .setAlign('center')
          .barcode(barcodeData, 'CODE128', { height: 120, width: 3, hri: true });
      } else {
        generator.setAlign('center').text('Invalid barcode').lineFeed();
      }
    } catch (error) {
      console.warn('Failed to print barcode:', error);
      generator
        .setAlign('center')
        .text('Barcode error')
        .lineFeed();
    }

    generator.lineFeed(2);

    // Cut paper
    generator.cut();

    // Print
    await this.print(generator.getBytes());
  }
}

// Export singleton instance
export const thermalPrinter = new ThermalPrinterService();
