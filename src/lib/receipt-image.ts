/**
 * Renders the receipt shown in an invoice modal (`.thermal-receipt-container`)
 * at the 58mm thermal width. The PDF download and the WhatsApp send both use
 * this render, so the customer gets the same receipt that prints.
 */
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function renderReceiptCanvas(): Promise<HTMLCanvasElement> {
  const receiptContainer = document.querySelector('.thermal-receipt-container') as HTMLElement | null;
  if (!receiptContainer) {
    throw new Error('Invoice not ready. Please try again.');
  }

  // Clone the entire container to preserve all styles
  const clone = receiptContainer.cloneNode(true) as HTMLElement;

  // Create a temporary visible container for html2canvas
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'fixed';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '0';
  tempContainer.style.width = '58mm';
  tempContainer.style.maxWidth = '58mm';
  tempContainer.style.backgroundColor = '#ffffff';
  tempContainer.style.zIndex = '99999';
  tempContainer.style.visibility = 'visible';
  tempContainer.style.display = 'block';

  // Copy computed styles to ensure proper rendering
  const computedStyle = window.getComputedStyle(receiptContainer);
  tempContainer.style.fontFamily = computedStyle.fontFamily || "'Courier New', monospace";

  tempContainer.appendChild(clone);
  document.body.appendChild(tempContainer);

  try {
    // Wait for the clone to be fully rendered
    await new Promise((resolve) => setTimeout(resolve, 300));

    const clonedReceipt = tempContainer.querySelector('.thermal-receipt') as HTMLElement | null;
    if (!clonedReceipt) {
      throw new Error('Cloned receipt element not found');
    }

    // Get dimensions from the original or use defaults
    const width = receiptContainer.offsetWidth || 219; // 58mm ≈ 219px at 96dpi
    const height = clonedReceipt.scrollHeight || clonedReceipt.offsetHeight || 800;

    const canvas = await html2canvas(clonedReceipt, {
      scale: 1.8,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width,
      height,
      allowTaint: false,
    });
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty or invalid. Please ensure the invoice is visible.');
    }
    return canvas;
  } finally {
    if (tempContainer.parentNode) {
      document.body.removeChild(tempContainer);
    }
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
