import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanScannedCode,
  confirmedScan,
  invoiceBarcodeValue,
  looksLikeInvoiceBarcode,
  looksLikeReceiptBarcode,
  looksLikeSaleBarcode,
} from './barcode.ts';

describe('cleanScannedCode', () => {
  it('strips quotes, hyphens, and junk the camera adds', () => {
    assert.equal(cleanScannedCode('  "INV-20260817-ABC12345"  '), 'INV20260817ABC12345');
    assert.equal(cleanScannedCode('JKT-001'), 'JKT001');
  });
});

describe('invoiceBarcodeValue', () => {
  it('compacts long INV numbers so CODE128 stays scannable on 58mm paper', () => {
    assert.equal(invoiceBarcodeValue('INV-20260817-ABC12345'), 'INVABC12345');
  });

  it('leaves sale numbers intact', () => {
    assert.equal(invoiceBarcodeValue('SL-20260817-0001'), 'SL202608170001');
  });
});

describe('looksLikeInvoiceBarcode', () => {
  it('accepts both full and compact invoice scans', () => {
    assert.equal(looksLikeInvoiceBarcode('INV-20260817-ABC12345'), true);
    assert.equal(looksLikeInvoiceBarcode('INVABC12345'), true);
    assert.equal(looksLikeInvoiceBarcode('1234567890128'), false);
    assert.equal(looksLikeInvoiceBarcode('SL202608170001'), false);
  });
});

describe('confirmedScan', () => {
  it('ignores a single flaky Quagga read', () => {
    assert.equal(confirmedScan(['INVABC12345']), null);
    assert.equal(confirmedScan(['AAA', 'BBB', 'CCC']), null);
  });

  it('accepts a code only after it repeats', () => {
    assert.equal(
      confirmedScan(['INVXX', 'INVABC12345', 'INVABC12345', 'INVABC12345']),
      'INVABC12345',
    );
  });
});

describe('looksLikeSaleBarcode', () => {
  it('accepts a sale receipt scan with or without its hyphens', () => {
    assert.equal(looksLikeSaleBarcode('SL-20260819-0001'), true);
    assert.equal(looksLikeSaleBarcode('SL202608190001'), true);
  });

  it('refuses a booking invoice, which belongs to another screen', () => {
    assert.equal(looksLikeSaleBarcode('INV-20260819-ABC12345'), false);
  });

  it('refuses an item tag', () => {
    assert.equal(looksLikeSaleBarcode('JKT-001'), false);
  });
});

describe('looksLikeReceiptBarcode', () => {
  it('covers both kinds of receipt and nothing else', () => {
    assert.equal(looksLikeReceiptBarcode('INV-20260819-ABC12345'), true);
    assert.equal(looksLikeReceiptBarcode('SL-20260819-0001'), true);
    assert.equal(looksLikeReceiptBarcode('JKT-001'), false);
  });
});
