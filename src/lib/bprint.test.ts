import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAndroidBridgeBookingInvoiceUrl,
  getBprintBookingInvoiceUrl,
  getBprintRentalInvoiceUrl,
  getBprintSaleInvoiceUrl,
} from './bprint.ts';

describe('invoice print URLs', () => {
  it('omits barcode_only on a full invoice print', () => {
    assert.equal(getBprintBookingInvoiceUrl('booking-1', 'full').includes('barcode_only'), false);
    assert.equal(getAndroidBridgeBookingInvoiceUrl('booking-1', 'full').includes('barcode_only'), false);
  });

  it('adds barcode_only=1 when reprinting just the bars', () => {
    const ios = getBprintBookingInvoiceUrl('booking-1', 'full', undefined, true);
    assert.match(ios, /barcode_only=1/);
    assert.match(ios, /booking-invoice/);
    assert.match(ios, /^bprint:\/\//);

    const android = getAndroidBridgeBookingInvoiceUrl('booking-1', 'dp', true);
    assert.match(android, /barcode_only/);
    assert.match(android, /booking-invoice/);
    assert.match(android, /suitlabs-print/);

    assert.match(getBprintRentalInvoiceUrl('rental-1', undefined, true), /barcode_only=1/);
    assert.match(getBprintSaleInvoiceUrl('sale-1', undefined, true), /barcode_only=1/);
  });
});
