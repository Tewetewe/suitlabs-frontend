import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { waitForReceiptBarcodes } from './receipt-barcode';

describe('waitForReceiptBarcodes', () => {
  it('does not let a receipt render while its barcode is still pending', async () => {
    const barcode = { dataset: { barcodeStatus: 'pending' } };
    const receipt = {
      querySelectorAll: () => [barcode],
    } as unknown as ParentNode;

    setTimeout(() => {
      barcode.dataset.barcodeStatus = 'ready';
    }, 20);

    await waitForReceiptBarcodes(receipt, 200);
    assert.equal(barcode.dataset.barcodeStatus, 'ready');
  });

  it('fails instead of producing a receipt with a missing barcode', async () => {
    const barcode = { dataset: { barcodeStatus: 'error' } };
    const receipt = {
      querySelectorAll: () => [barcode],
    } as unknown as ParentNode;

    await assert.rejects(
      waitForReceiptBarcodes(receipt, 200),
      /barcode could not be generated/i,
    );
  });
});
