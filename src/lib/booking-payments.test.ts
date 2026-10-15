import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bookingPaymentLabels } from './booking-payments';

describe('bookingPaymentLabels', () => {
  it('names the DP and the rest, each with its own bank', () => {
    const labels = bookingPaymentLabels(
      [
        { kind: 'payment', method: 'transfer', pot: 'bca' },
        { kind: 'payment', method: 'qris', pot: 'bni' },
      ],
      'dp_transfer',
    );
    assert.equal(labels[0], 'DP · Transfer · BCA');
    assert.match(labels[1], /^Remaining · .+ · BNI$/);
  });

  it('names a full payment, cash, and a refund', () => {
    const labels = bookingPaymentLabels(
      [
        { kind: 'payment', method: 'cash', pot: 'cash' },
        { kind: 'refund', method: 'cash', pot: 'cash' },
      ],
      'full_cash',
    );
    assert.match(labels[0], /^Full payment · .+ · Cash Drawer$/);
    assert.match(labels[1], /^Refund · /);
  });
});
