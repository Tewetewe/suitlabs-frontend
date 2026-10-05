/**
 * Renders the receipt shown in an invoice modal (`.thermal-receipt-container`)
 * at the 58mm thermal width. The PDF download and the WhatsApp send both use
 * this render, so the customer gets the same receipt that prints.
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { waitForReceiptBarcodes } from './receipt-barcode';

async function renderReceiptCanvas(): Promise<HTMLCanvasElement> {
  const receiptContainer = document.querySelector('.thermal-receipt-container') as HTMLElement | null;
  const receipt = receiptContainer?.querySelector('.thermal-receipt') as HTMLElement | null;
  if (!receiptContainer || !receipt) {
    throw new Error('Invoice not ready. Please try again.');
  }

  await waitForReceiptBarcodes(receipt);

  // Copy the receipt at once, so the render still works if the modal closes.
  // cloneNode copies a <canvas> blank, so each canvas (the barcode) is drawn
  // into its copy by hand.
  const clone = receipt.cloneNode(true) as HTMLElement;
  const sourceCanvases = receipt.querySelectorAll('canvas');
  clone.querySelectorAll('canvas').forEach((copy, i) => {
    const source = sourceCanvases[i];
    if (!source) return;
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext('2d')?.drawImage(source, 0, 0);
  });

  // html2canvas draws Courier text a few pixels lower than the browser, so a
  // rule right under a line touches it. The copy gets a little more room above
  // each rule; the screen and the print keep the shared stylesheet.
  clone.querySelectorAll<HTMLElement>('.receipt-divider').forEach((rule) => {
    rule.style.marginTop = '10px';
  });
  clone.querySelectorAll<HTMLElement>('.receipt-total').forEach((total) => {
    total.style.marginTop = '8px';
  });

  // The copy sits outside the modal, so it lays out at the receipt's own
  // 58 mm width with the same receipt stylesheet, not at the modal width.
  const holder = document.createElement('div');
  holder.className = 'thermal-receipt-container';
  holder.style.position = 'fixed';
  holder.style.left = '-10000px';
  holder.style.top = '0';
  holder.style.width = 'auto';
  holder.style.display = 'block';
  holder.style.background = '#ffffff';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    const width = Math.ceil(clone.getBoundingClientRect().width) || 219; // 58mm ≈ 219px at 96dpi
    const height = Math.ceil(clone.scrollHeight) || 800;

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: width,
      allowTaint: false,
    });
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty or invalid. Please ensure the invoice is visible.');
    }
    return canvas;
  } finally {
    holder.remove();
  }
}

function receiptJpeg(canvas: HTMLCanvasElement): string {
  // JPEG is much smaller than PNG for a receipt and keeps the text sharp at 0.92.
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  if (!imgData || !imgData.startsWith('data:image/jpeg;base64,')) {
    throw new Error('Invalid image data generated');
  }
  return imgData;
}

/** Saves the receipt as a 58mm-wide PDF. */
export async function downloadReceiptPdf(fileName: string): Promise<void> {
  const canvas = await renderReceiptCanvas();
  const imgWidth = 58;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [imgWidth, imgHeight],
    compress: true,
  });
  pdf.addImage(receiptJpeg(canvas), 'JPEG', 0, 0, imgWidth, imgHeight);
  pdf.save(fileName);
}

/** Returns the receipt as a JPEG file, for the WhatsApp send. */
export async function renderReceiptImage(fileName: string): Promise<File> {
  const canvas = await renderReceiptCanvas();
  const blob = await (await fetch(receiptJpeg(canvas))).blob();
  return new File([blob], fileName, { type: 'image/jpeg' });
}
