import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { barcodeModuleWidth, canPrintBarcode } from './escpos';

// 58 mm at 203 dpi is 384 dots. CODE128-B spends 11 modules a character plus
// start, checksum and stop, so the width has to come down as the code grows.
describe('barcodeModuleWidth', () => {
  it('keeps the widest bars a short code allows', () => {
    // INV + 8 chars = 11 chars = 156 modules. 156 x 2 fits, 156 x 3 does not.
    assert.equal(barcodeModuleWidth(11), 2);
  });

  it('narrows to one module for a long code', () => {
    // 30 chars = 365 modules, which only fits at width 1.
    assert.equal(barcodeModuleWidth(30), 1);
  });

  it('gives up when even the narrowest bars overflow the paper', () => {
    // 40 chars = 475 modules, over 384 at width 1.
    assert.equal(barcodeModuleWidth(40), 0);
  });

  it('treats an empty code as unprintable', () => {
    assert.equal(barcodeModuleWidth(0), 0);
  });
});

describe('canPrintBarcode', () => {
  it('accepts a compact invoice number', () => {
    assert.equal(canPrintBarcode('INVABC12345', 2), true);
  });

  it('refuses a code too wide for the paper, so the caller prints text', () => {
    assert.equal(canPrintBarcode('SALEABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJ', 2), false);
  });
});
