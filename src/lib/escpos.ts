/**
 * ESC/POS Command Generator for Thermal Printers
 * Supports 58mm thermal printers with ESC/POS compatible command set
 */

import { formatCurrency } from './currency';

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

const PRINTER_SYMBOLS: Array<[RegExp, string]> = [
  [/[•·●◦–—−‑]/g, '-'],
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/…/g, '...'],
  [/×/g, 'x'],
  [/[\u00a0\u202f]/g, ' '],
];

/** Map Unicode onto the ASCII a 58 mm ESC/POS printer can actually print. */
export function toPrinterText(text: string): string {
  let out = text.normalize('NFKD');
  for (const [pattern, replacement] of PRINTER_SYMBOLS) {
    out = out.replace(pattern, replacement);
  }
  return out.replace(/[^\n\r\t\x20-\x7e]/g, '').replace(/\t/g, ' ');
}

export function wrapPrinterText(
  text: string,
  width: number,
  hangingIndent: boolean,
): string[] {
  const cols = Math.max(8, width);
  const parts = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const part of parts) {
    lines.push(...wrapPrinterParagraph(part, cols, hangingIndent));
  }
  return lines.length > 0 ? lines : [''];
}

function wrapPrinterParagraph(para: string, width: number, hangingIndent: boolean): string[] {
  if (para.length <= width) {
    return [para];
  }
  const leading = para.match(/^ */)?.[0].length ?? 0;
  const prefix = para.slice(0, leading);
  let remaining = para.slice(leading);
  const contPrefix =
    hangingIndent && leading > 0 && leading + 2 <= width - 8
      ? ' '.repeat(leading + 2)
      : prefix;
  const lines: string[] = [];
  let first = true;
  while (remaining) {
    const pfx = first ? prefix : contPrefix;
    first = false;
    const avail = Math.max(1, width - pfx.length);
    if (remaining.length <= avail) {
      lines.push(pfx + remaining);
      break;
    }
    const chunk = remaining.slice(0, avail);
    const sp = chunk.lastIndexOf(' ');
    if (sp > 0) {
      lines.push(pfx + remaining.slice(0, sp).trimEnd());
      remaining = remaining.slice(sp).trimStart();
      continue;
    }
    lines.push(pfx + chunk);
    remaining = remaining.slice(avail);
  }
  return lines;
}

function printerColumnsForFont(width: number): number {
  return width >= 2 ? 16 : 32;
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
  private charWidth = 32;
  private hangingIndent = true;

  /**
   * Initialize printer
   */
  initialize(): this {
    this.commands.push(stringToBytes(ESC + '@'));
    this.commands.push(stringToBytes(ESC + 't' + String.fromCharCode(0)));
    this.charWidth = 32;
    this.hangingIndent = true;
    return this;
  }

  /**
   * Set text alignment
   * @param align 'left' | 'center' | 'right'
   */
  setAlign(align: 'left' | 'center' | 'right'): this {
    const alignCodes = { left: 0, center: 1, right: 2 };
    this.hangingIndent = align === 'left';
    this.commands.push(stringToBytes(ESC + 'a' + String.fromCharCode(alignCodes[align])));
    return this;
  }

  /**
   * Set font size (width: 1-8, height: 1-8)
   */
  setFontSize(width: number = 1, height: number = 1): this {
    const w = Math.max(1, Math.min(8, width));
    const h = Math.max(1, Math.min(8, height));
    this.charWidth = printerColumnsForFont(w);
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
   * Add text. Long lines wrap on word boundaries for 58 mm paper.
   */
  text(text: string): this {
    const lines = wrapPrinterText(toPrinterText(text), this.charWidth, this.hangingIndent);
    this.commands.push(stringToBytes(lines.join(LF)));
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
  barcode(
    code: string,
    type: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' = 'CODE128',
    options?: { height?: number; width?: number; hri?: boolean },
  ): this {
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
    const height = options?.height ?? 80;
    const hri = options?.hri !== false;
    const modules = 11 * code.length + 35;
    let width = options?.width ?? 3;
    while (width > 1 && modules * width > 384) {
      width--;
    }
    if (modules * width > 384) {
      console.warn(`Barcode too wide for 58mm paper (${code.length} chars)`);
      return this;
    }

    // Set barcode height (50-255, default 80 for better visibility)
    this.commands.push(stringToBytes(GS + 'h' + String.fromCharCode(height)));

    // Set barcode width (2-6, default 3)
    this.commands.push(stringToBytes(GS + 'w' + String.fromCharCode(width)));

    // Set HRI (Human Readable Interpretation) position (0=none, 1=above, 2=below, 3=above+below)
    this.commands.push(stringToBytes(GS + 'H' + String.fromCharCode(hri ? 2 : 0)));

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
    this.charWidth = 32;
    this.hangingIndent = true;
    return this;
  }
}

/**
 * Format currency for printing
 */
export function formatCurrencyForPrint(amount: number): string {
  return formatCurrency(amount);
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
