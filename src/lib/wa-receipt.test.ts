import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { receiptNumberProblem, receiptSendFailure } from './wa-receipt';

describe('receiptSendFailure', () => {
  it('keeps the number field closed when a new number fixes nothing', () => {
    assert.equal(receiptSendFailure('WABLAS_NOT_CONFIGURED: Wablas WhatsApp is not configured'), 'not_configured');
    assert.equal(receiptSendFailure('CUSTOMER_WA_OPT_OUT: The customer opted out'), 'opt_out');
    assert.equal(receiptSendFailure('RECEIPT_COOLDOWN: This receipt was just sent'), 'cooldown');
    assert.equal(receiptSendFailure('RECEIPT_IMAGE_UNREACHABLE: The receipt image link does not open'), 'image');
    assert.equal(
      receiptSendFailure('business error [WABLAS_SEND_FAILED]: wablas v2 rejected: your package not support; v1 fallback: wablas v1 rejected: your package not support'),
      'package',
    );
  });

  it('opens the number field for a number problem or a refused send', () => {
    assert.equal(receiptSendFailure('This phone number cannot be used for WhatsApp'), 'number');
    assert.equal(receiptSendFailure('CUSTOMER_PHONE_REQUIRED: Customer phone cannot be used for WhatsApp'), 'number');
    assert.equal(receiptSendFailure('WABLAS_SEND_FAILED: phone not registered'), 'number');
  });
});

describe('receiptNumberProblem', () => {
  it('says plainly what is wrong with the number', () => {
    assert.equal(
      receiptNumberProblem('business error [WABLAS_SEND_FAILED]: wablas v2 rejected: phone number is not registered on WhatsApp'),
      'This number is not on WhatsApp.',
    );
    assert.equal(receiptNumberProblem('This phone number cannot be used for WhatsApp'), 'This number cannot be used for WhatsApp. Check the digits.');
    assert.equal(receiptNumberProblem('wablas v2 HTTP 500: timeout'), 'WhatsApp did not take the receipt for this number.');
  });
});
