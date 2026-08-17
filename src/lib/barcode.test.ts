import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cleanScannedCode,
  confirmedScan,
  invoiceBarcodeValue,
  looksLikeInvoiceBarcode,
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
