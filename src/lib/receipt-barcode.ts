const BARCODE_SELECTOR = 'canvas[data-receipt-barcode]';
const POLL_MS = 10;

type ReceiptBarcodeCanvas = {
  dataset: {
    barcodeStatus?: string;
  };
};

/** Wait until every invoice barcode has finished drawing before capturing it. */
export async function waitForReceiptBarcodes(receipt: ParentNode, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();

  while (true) {
    const barcodes = Array.from(
      receipt.querySelectorAll(BARCODE_SELECTOR),
    ) as unknown as ReceiptBarcodeCanvas[];

    if (barcodes.length === 0 || barcodes.every((barcode) => barcode.dataset.barcodeStatus === 'ready')) {
      return;
    }
    if (barcodes.some((barcode) => barcode.dataset.barcodeStatus === 'error')) {
      throw new Error('The invoice barcode could not be generated. Please try again.');
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error('The invoice barcode is still loading. Please try again.');
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}
