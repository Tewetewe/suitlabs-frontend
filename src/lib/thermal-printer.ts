/**
 * Thermal Printer Service
 * Handles Bluetooth and USB connection to thermal printers
 */

import { ESCPOSGenerator, formatCurrencyForPrint, formatDateForPrint, formatDateTimeForPrint } from './escpos';
import { InvoiceData } from '@/types';
import { Rental } from '@/types';

// Bluetooth Service UUIDs for Serial Port Profile (SPP)
const BLUETOOTH_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb'; // Serial Port Profile

export interface ThermalPrinterDevice {
  device: BluetoothDevice;
  server?: BluetoothRemoteGATTServer;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

export class ThermalPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

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
      // Request Bluetooth device with Serial Port Profile
      // Try with specific service UUID first, then fallback to acceptAllDevices
      let deviceRequestOptions: RequestDeviceOptions;
      
      try {
        // First try with Serial Port Profile UUID
        deviceRequestOptions = {
          filters: [
            { services: [BLUETOOTH_SERVICE_UUID] }
          ],
          optionalServices: [BLUETOOTH_SERVICE_UUID],
        };
        this.device = await navigator.bluetooth!.requestDevice(deviceRequestOptions);
      } catch (e: unknown) {
        // If that fails, try accepting all devices (user will need to select)
        const error = e as { name?: string };
        if (error.name === 'NotFoundError' || error.name === 'SecurityError') {
          deviceRequestOptions = {
            acceptAllDevices: true,
            optionalServices: [BLUETOOTH_SERVICE_UUID],
          };
          this.device = await navigator.bluetooth!.requestDevice(deviceRequestOptions);
        } else {
          throw e;
        }
      }

      if (!this.device.gatt) {
        throw new Error('Device does not support GATT');
      }

      // Connect to GATT server
      this.server = await this.device.gatt.connect();

      // Try to get the Serial Port Profile service
      let service: BluetoothRemoteGATTService;
      try {
        service = await this.server.getPrimaryService(BLUETOOTH_SERVICE_UUID);
      } catch {
        // If SPP service not found, try to find any service with writable characteristics
        const services = await this.server.getPrimaryServices();
        let foundService: BluetoothRemoteGATTService | null = null;
        
        for (const svc of services) {
          try {
            const chars = await svc.getCharacteristics();
            const writableChar = chars.find(
              (char: BluetoothRemoteGATTCharacteristic) => char.properties.write || char.properties.writeWithoutResponse
            );
            if (writableChar) {
              foundService = svc;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (!foundService) {
          throw new Error('No suitable service found. Make sure your printer supports Bluetooth Serial Port Profile.');
        }
        service = foundService;
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
        // Re-establish service and characteristic
        const service = await this.server.getPrimaryService(BLUETOOTH_SERVICE_UUID);
        const characteristics = await service.getCharacteristics();
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
      .text('Sewa Jas Jimbaran & Nusadua')
      .lineFeed(2);

    // Company Info (optimized for 58mm paper width)
    generator
      .setFontSize(1, 1)
      .text(invoice.company?.address || 'Jl. Taman Kebo Iwa No.1D')
      .lineFeed()
      .text('Benoa, Kec. Kuta Sel., Kab. Badung')
      .lineFeed()
      .text('Bali 80362')
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

    // Print Invoice Number as Barcode
    generator
      .setAlign('center')
      .text('Invoice Barcode:')
      .lineFeed();
    
    try {
      // Use invoice number for barcode (remove any non-alphanumeric characters for CODE128)
      const barcodeData = invoice.invoice_number.replace(/[^A-Za-z0-9]/g, '');
      if (barcodeData.length > 0) {
        generator.barcode(barcodeData, 'CODE128');
      }
    } catch (error) {
      console.warn('Failed to print barcode:', error);
      // Continue without barcode if it fails
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
      .lineFeed()
      .text(`Email: ${invoice.customer_email}`)
      .lineFeed()
      .text(`Phone: ${invoice.customer_phone}`)
      .lineFeed(2);

    generator.separator();

    // Items
    generator
      .setBold(true)
      .text('ITEMS:')
      .lineFeed()
      .setBold(false);

    if (invoice.items && invoice.items.length > 0) {
      const isPackagePricing = invoice.items.every(
        (item) => (item.unit_price || 0) <= 0 && (item.total || 0) <= 0
      ) && (invoice.total_amount || 0) > 0;

      invoice.items.forEach((item) => {
        if (isPackagePricing && (item.unit_price || 0) <= 0 && (item.total || 0) <= 0) {
          generator.text(`  ${item.description}`).lineFeed();
        } else {
          generator
            .text(`  ${item.description}`)
            .lineFeed()
            .text(`    ${item.quantity} PCS × ${formatCurrencyForPrint(item.unit_price || 0)} = ${formatCurrencyForPrint(item.total || 0)}`)
            .lineFeed();
        }
      });

      if (isPackagePricing) {
        generator
          .setBold(true)
          .text(`Package Total: ${formatCurrencyForPrint(invoice.total_amount || 0)}`)
          .lineFeed()
          .setBold(false);
      }
    } else {
      generator.text(invoice.product_name || 'Booking Package').lineFeed();
    }

    generator.lineFeed();
    generator.separator();

    // Summary
    generator
      .text(`Subtotal: ${formatCurrencyForPrint(invoice.total_amount || 0)}`)
      .lineFeed();

    if ((invoice.discount_amount || 0) > 0) {
      generator.text(`Discount: (${formatCurrencyForPrint(invoice.discount_amount || 0)})`).lineFeed();
    }

    generator
      .setBold(true)
      .setFontSize(1, 1)
      .text(`TOTAL AMOUNT: ${formatCurrencyForPrint(invoice.final_amount || invoice.total_amount || 0)}`)
      .lineFeed()
      .setBold(false)
      .setFontSize(1, 1);

    generator.lineFeed();
    generator.separator();

    // Payment Info
    if (invoice.invoice_type === 'dp') {
      generator
        .text(`Down Payment: ${formatCurrencyForPrint(invoice.due_amount || 0)}`)
        .lineFeed()
        .text(`Remaining: ${formatCurrencyForPrint((invoice.final_amount || invoice.total_amount || 0) - (invoice.due_amount || 0))}`)
        .lineFeed();
    } else {
      generator.text(`Due Amount: ${formatCurrencyForPrint(invoice.due_amount || 0)}`).lineFeed();
    }

    generator
      .setBold(true)
      .text(`Payment Status: ${invoice.payment_status?.toUpperCase() || 'PENDING'}`)
      .lineFeed()
      .setBold(false);

    if (invoice.booking_date) {
      generator.lineFeed();
      generator.separator();
      generator.text(`Booking Date: ${formatDateForPrint(invoice.booking_date)}`).lineFeed();
    }

    // Footer
    generator.lineFeed();
    generator.separator();
    generator
      .setAlign('center')
      .text('Thank you for using SuitLabs!')
      .lineFeed()
      .setFontSize(1, 1)
      .text('All bookings subject to T&C')
      .lineFeed()
      .text('6-Month Warranty. T&C apply.')
      .lineFeed()
      .text('suitlabs.id')
      .lineFeed(2);

    // Print QR Code with invoice details
    try {
      const qrData = JSON.stringify({
        invoice: invoice.invoice_number,
        booking: invoice.booking_id,
        type: invoice.invoice_type,
        amount: invoice.final_amount,
      });
      generator
        .setAlign('center')
        .text('Scan for details:')
        .lineFeed();
      generator.qrcode(qrData, 6);
    } catch (error) {
      console.warn('Failed to print QR code:', error);
      // Continue without QR code if it fails
    }

    generator.lineFeed(2);

    // Cut paper
    generator.cut();

    // Print
    await this.print(generator.getBytes());
  }

  /**
   * Print rental invoice
   */
  async printRentalInvoice(rental: Rental): Promise<void> {
    const generator = new ESCPOSGenerator();
    const invoiceNumber = `INV-${rental.id.slice(-8).toUpperCase()}`;
    const items = (rental.items || rental.booking?.items || []) as Array<{
      item?: { name?: string; size?: { label?: string } };
      quantity: number;
      unit_price: number;
      total_price: number;
      discount_amount?: number;
    }>;

    const itemsSubtotal = items.reduce((sum, item) => {
      const itemTotal = item.total_price || (item.unit_price || 0) * (item.quantity || 1);
      return sum + itemTotal;
    }, 0);

    const itemsDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const total = (rental.total_cost || 0) + (rental.late_fee || 0) + (rental.damage_charges || 0);
    const refundableDeposit = Math.max((rental.security_deposit || 0) - (rental.damage_charges || 0), 0);

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
      .text('Sewa Jas Jimbaran & Nusadua')
      .lineFeed(2);

    // Company Info (optimized for 58mm paper width)
    generator
      .setFontSize(1, 1)
      .text('Jl. Taman Kebo Iwa No.1D')
      .lineFeed()
      .text('Benoa, Kec. Kuta Sel., Kab. Badung')
      .lineFeed()
      .text('Bali 80362')
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

    if (rental.customer) {
      generator
        .text(`Customer: ${rental.customer.first_name} ${rental.customer.last_name}`)
        .lineFeed()
        .text(`Phone: ${rental.customer.phone}`)
        .lineFeed();
    }

    generator.lineFeed();

    // Print Invoice Number as Barcode
    generator
      .setAlign('center')
      .text('Invoice Barcode:')
      .lineFeed();
    
    try {
      // Use invoice number for barcode (remove any non-alphanumeric characters for CODE128)
      const barcodeData = invoiceNumber.replace(/[^A-Za-z0-9]/g, '');
      if (barcodeData.length > 0) {
        generator.barcode(barcodeData, 'CODE128');
      }
    } catch (error) {
      console.warn('Failed to print barcode:', error);
      // Continue without barcode if it fails
    }

    generator.lineFeed();
    generator.separator();

    // Items
    generator
      .setBold(true)
      .text('ITEMS:')
      .lineFeed()
      .setBold(false);

    if (items.length > 0) {
      items.forEach((item) => {
        const itemName = item.item?.name || 'Item';
        const itemSize = item.item?.size?.label || '';
        const description = itemSize ? `${itemName} - ${itemSize}` : itemName;
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || item.total_price || 0;
        const itemTotal = item.total_price || unitPrice * quantity;
        const discount = item.discount_amount ?? 0;

        generator.text(`  ${description}`).lineFeed();
        generator.text(`    ${quantity} PCS × ${formatCurrencyForPrint(unitPrice)} = ${formatCurrencyForPrint(itemTotal)}`).lineFeed();
        if (discount > 0) {
          generator.text(`    Discount: (${formatCurrencyForPrint(discount)})`).lineFeed();
        }
      });
    } else {
      generator.text('Rental Package').lineFeed();
    }

    generator.lineFeed();
    generator.separator();

    // Summary
    generator
      .text(`Subtotal: ${formatCurrencyForPrint(itemsSubtotal || rental.total_cost || 0)}`)
      .lineFeed();

    if (itemsDiscount > 0) {
      generator.text(`Discount: (${formatCurrencyForPrint(itemsDiscount)})`).lineFeed();
    }

    if (rental.late_fee > 0) {
      generator.text(`Late Fee: ${formatCurrencyForPrint(rental.late_fee)}`).lineFeed();
    }

    if (rental.damage_charges > 0) {
      generator.text(`Damage: ${formatCurrencyForPrint(rental.damage_charges)}`).lineFeed();
    }

    generator
      .setBold(true)
      .setFontSize(1, 1)
      .text(`GRAND TOTAL: ${formatCurrencyForPrint(total)}`)
      .lineFeed()
      .setBold(false)
      .setFontSize(1, 1);

    // Deposit
    if (rental.security_deposit > 0) {
      generator.lineFeed();
      generator.separator();
      generator
        .text(`Security Deposit: ${formatCurrencyForPrint(rental.security_deposit)}`)
        .lineFeed();

      if (rental.damage_charges > 0) {
        generator.text(`Damage Deduction: (${formatCurrencyForPrint(rental.damage_charges)})`).lineFeed();
      }

      generator
        .setBold(true)
        .text(`Refundable: ${formatCurrencyForPrint(refundableDeposit)}`)
        .lineFeed()
        .setBold(false);
    }

    // Dates
    generator.lineFeed();
    generator.separator();
    generator
      .text(`Rental Date: ${formatDateForPrint(rental.rental_date)}`)
      .lineFeed()
      .text(`Return Date: ${formatDateForPrint(rental.return_date)}`)
      .lineFeed();

    if (rental.actual_pickup_date) {
      generator.text(`Pickup: ${formatDateForPrint(rental.actual_pickup_date)}`).lineFeed();
    }

    if (rental.actual_return_date) {
      generator.text(`Returned: ${formatDateForPrint(rental.actual_return_date)}`).lineFeed();
    }

    // Notes
    if (rental.notes) {
      generator.lineFeed();
      generator.separator();
      generator
        .setBold(true)
        .text('NOTE:')
        .lineFeed()
        .setBold(false)
        .text(rental.notes)
        .lineFeed();
    }

    // Footer
    generator.lineFeed();
    generator.separator();
    generator
      .setAlign('center')
      .text('Thank you for using SuitLabs!')
      .lineFeed()
      .setFontSize(1, 1)
      .text('All rentals subject to T&C')
      .lineFeed()
      .text('6-Month Warranty. T&C apply.')
      .lineFeed()
      .text('suitlabs.id')
      .lineFeed(2);

    // Print QR Code with rental details
    try {
      const qrData = JSON.stringify({
        invoice: invoiceNumber,
        rental: rental.id,
        status: rental.status,
        total: total,
      });
      generator
        .setAlign('center')
        .text('Scan for details:')
        .lineFeed();
      generator.qrcode(qrData, 6);
    } catch (error) {
      console.warn('Failed to print QR code:', error);
      // Continue without QR code if it fails
    }

    generator.lineFeed(2);

    // Cut paper
    generator.cut();

    // Print
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

    // Item Code
    generator
      .setFontSize(1, 1)
      .text(`#${item.code}`)
      .lineFeed();

    // Item Details (if available) - optional, smaller
    if (item.brand || item.color || item.size?.label) {
      const details: string[] = [];
      if (item.brand) details.push(item.brand);
      if (item.color) details.push(item.color);
      if (item.size?.label) details.push(`Size: ${item.size.label}`);
      
      if (details.length > 0) {
        generator
          .setFontSize(1, 1)
          .text(details.join(' • '))
          .lineFeed();
      }
    }

    generator.lineFeed();

    // Print Barcode (centered, no label text)
    try {
      // Clean barcode value (remove non-alphanumeric for CODE128)
      const barcodeData = item.barcode.replace(/[^A-Za-z0-9]/g, '');
      if (barcodeData.length > 0) {
        generator
          .setAlign('center')
          .barcode(barcodeData, 'CODE128');
      } else {
        generator
          .setAlign('center')
          .text('Invalid barcode')
          .lineFeed();
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
