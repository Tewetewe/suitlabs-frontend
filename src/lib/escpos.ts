/**
 * ESC/POS Command Generator for Thermal Printers
 * Supports 58mm thermal printers with ESC/POS compatible command set
 */

// ESC/POS Command Constants
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

export interface ESCPOSCommands {
  initialize(): Uint8Array;
  setAlign(align: 'left' | 'center' | 'right'): Uint8Array;
  setFontSize(width: number, height: number): Uint8Array;
  setBold(enabled: boolean): Uint8Array;
  setUnderline(enabled: boolean): Uint8Array;
  text(text: string): Uint8Array;
  lineFeed(lines?: number): Uint8Array;
  cut(): Uint8Array;
  barcode(code: string, type: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8'): Uint8Array;
  qrcode(data: string, size?: number): Uint8Array;
  separator(): Uint8Array;
}

/**
 * Convert string to Uint8Array (UTF-8 encoding)
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Combine multiple Uint8Arrays into one
 */
function combineBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * ESC/POS Command Generator Class
 */
export class ESCPOSGenerator {
  private commands: Uint8Array[] = [];

  /**
   * Initialize printer
   */
  initialize(): this {
    this.commands.push(stringToBytes(ESC + '@'));
    return this;
  }

  /**
   * Set text alignment
   * @param align 'left' | 'center' | 'right'
   */
  setAlign(align: 'left' | 'center' | 'right'): this {
    const alignCodes = { left: 0, center: 1, right: 2 };
    this.commands.push(stringToBytes(ESC + 'a' + String.fromCharCode(alignCodes[align])));
    return this;
  }

  /**
   * Set font size (width: 1-8, height: 1-8)
   */
  setFontSize(width: number = 1, height: number = 1): this {
    const w = Math.max(1, Math.min(8, width));
    const h = Math.max(1, Math.min(8, height));
    this.commands.push(stringToBytes(ESC + '!' + String.fromCharCode((w - 1) | ((h - 1) << 4))));
    return this;
  }

  /**
   * Set bold text
   */
  setBold(enabled: boolean): this {
    this.commands.push(stringToBytes(ESC + 'E' + String.fromCharCode(enabled ? 1 : 0)));
    return this;
  }

  /**
   * Set underline
   */
  setUnderline(enabled: boolean): this {
    this.commands.push(stringToBytes(ESC + '-' + String.fromCharCode(enabled ? 1 : 0)));
    return this;
  }

  /**
   * Add text
   */
  text(text: string): this {
    this.commands.push(stringToBytes(text));
    return this;
  }

  /**
   * Line feed
   */
  lineFeed(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.commands.push(stringToBytes(LF));
    }
    return this;
  }

  /**
   * Add separator line (dashed)
   */
  separator(): this {
    this.text('--------------------------------').lineFeed();
    return this;
  }

  /**
   * Print barcode
   */
  barcode(code: string, type: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' = 'CODE128'): this {
    if (!code || code.length === 0) {
      console.warn('Empty barcode code provided');
      return this;
    }

    const typeCodes: Record<string, number> = {
      CODE128: 73,
      CODE39: 4,
      EAN13: 2,
      EAN8: 3,
    };

    const typeCode = typeCodes[type] || 73;

    // Set barcode height (50-255, default 80 for better visibility)
    this.commands.push(stringToBytes(GS + 'h' + String.fromCharCode(80)));

    // Set barcode width (2-6, default 3)
    this.commands.push(stringToBytes(GS + 'w' + String.fromCharCode(3)));

    // Set HRI (Human Readable Interpretation) position (0=none, 1=above, 2=below, 3=above+below)
    // Using 2 (below) so the barcode number appears below the barcode
    this.commands.push(stringToBytes(GS + 'H' + String.fromCharCode(2)));

    // Print barcode
    // For CODE128: GS k n d1...dk
    // n = 73 (CODE128), followed by length byte, then data
    const codeBytes = stringToBytes(code);
    const length = codeBytes.length;
    
    // Ensure length fits in one byte (max 255)
    if (length > 255) {
      console.warn(`Barcode code too long (${length} chars), truncating to 255`);
      const truncated = codeBytes.slice(0, 255);
      this.commands.push(stringToBytes(GS + 'k' + String.fromCharCode(typeCode) + String.fromCharCode(255)));
      this.commands.push(truncated);
    } else {
      this.commands.push(stringToBytes(GS + 'k' + String.fromCharCode(typeCode) + String.fromCharCode(length)));
      this.commands.push(codeBytes);
    }

    this.lineFeed();
    return this;
  }

  /**
   * Print QR Code
   */
  qrcode(data: string, size: number = 6): this {
    // QR Code size (1-16, default 6)
    const qrSize = Math.max(1, Math.min(16, size));

    // Function 165: Store QR code data
    const storeData = GS + '(k' + 
      String.fromCharCode(data.length + 3) + // pL
      String.fromCharCode(0) + // pH
      String.fromCharCode(49) + // cn
      String.fromCharCode(80) + // fn
      String.fromCharCode(48) + // m
      String.fromCharCode(data.length) + // Length
      String.fromCharCode(0) + // Length high byte
      data;

    // Function 167: Print QR code
    const printQR = GS + '(k' +
      String.fromCharCode(3) + // pL
      String.fromCharCode(0) + // pH
      String.fromCharCode(49) + // cn
      String.fromCharCode(81) + // fn
      String.fromCharCode(48) + // m
      String.fromCharCode(qrSize); // Size

    this.commands.push(stringToBytes(storeData));
    this.commands.push(stringToBytes(printQR));
    this.lineFeed(2);
    return this;
  }

  /**
   * Cut paper (partial cut)
   */
  cut(): this {
    this.commands.push(stringToBytes(GS + 'V' + String.fromCharCode(66) + String.fromCharCode(0)));
    return this;
  }

  /**
   * Get all commands as single Uint8Array
   */
  getBytes(): Uint8Array {
    return combineBytes(...this.commands);
  }

  /**
   * Reset command buffer
   */
  reset(): this {
    this.commands = [];
    return this;
  }
}

/**
 * Format currency for printing
 */
export function formatCurrencyForPrint(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date for printing
 */
export function formatDateForPrint(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format datetime for printing
 */
export function formatDateTimeForPrint(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
