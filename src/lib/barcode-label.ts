import JsBarcode from 'jsbarcode';

export interface BarcodeLabelDrawing {
  value: string;
  itemName: string;
  itemCode: string;
  sizeLabel?: string;
  format?: 'EAN13' | 'CODE128' | 'CODE39';
  width?: number;
  height?: number;
  fontSize?: number;
}

/**
 * Draws the item label (name, size, code, barcode) on a canvas. The item page
 * shows it, and the Items list prints it without opening the item.
 */
export function drawBarcodeLabel(
  canvas: HTMLCanvasElement,
  { value, itemName, itemCode, sizeLabel, format = 'CODE128', width = 3, height = 120, fontSize = 14 }: BarcodeLabelDrawing,
): void {
  let cleanedValue = value.trim();
  if (cleanedValue.startsWith('\\"') && cleanedValue.endsWith('\\"')) {
    cleanedValue = cleanedValue.substring(2, cleanedValue.length - 2);
  } else if (cleanedValue.startsWith('"') && cleanedValue.endsWith('"')) {
    cleanedValue = cleanedValue.substring(1, cleanedValue.length - 1);
  }

  // Set canvas size for the label
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas is not available.');
  ctx.imageSmoothingEnabled = false;

  // Calculate dimensions
  const labelWidth = 384;
  const labelHeight = 320;
  
  canvas.width = labelWidth;
  canvas.height = labelHeight;

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, labelWidth, labelHeight);

  // Add border
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, labelWidth, labelHeight);

  // Draw item name
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(itemName, labelWidth / 2, 28);

  let barcodeY = 48;
  if (sizeLabel) {
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 42px Arial';
    ctx.fillText(sizeLabel, labelWidth / 2, 78);
    barcodeY = 96;
  }

  ctx.fillStyle = '#374151';
  ctx.font = '14px Arial';
  ctx.fillText(`#${itemCode}`, labelWidth / 2, barcodeY);
  barcodeY += 12;

  const barcodeCanvas = document.createElement('canvas');
  JsBarcode(barcodeCanvas, cleanedValue, {
    format: format,
    width: width,
    height: height,
    displayValue: false,
    fontSize: fontSize,
    margin: 8,
    background: '#ffffff',
    lineColor: '#000000',
  });

  const maxBarcodeW = 360;
  let drawW = barcodeCanvas.width;
  if (drawW > maxBarcodeW) {
    const barWidth = Math.max(1, Math.floor(maxBarcodeW / Math.max(1, cleanedValue.length * 11 + 35)));
    JsBarcode(barcodeCanvas, cleanedValue, {
      format: format,
      width: barWidth,
      height: height,
      displayValue: false,
      fontSize: fontSize,
      margin: 8,
      background: '#ffffff',
      lineColor: '#000000',
    });
    drawW = barcodeCanvas.width;
  }
  const barcodeX = Math.floor((labelWidth - drawW) / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(barcodeCanvas, barcodeX, barcodeY);
}

/** The item label as a PNG data URL, for the browser print route. */
export function barcodeLabelDataUrl(label: BarcodeLabelDrawing): string {
  const canvas = document.createElement('canvas');
  drawBarcodeLabel(canvas, label);
  return canvas.toDataURL('image/png');
}
