import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canGiveCashback, cashbackAmount } from './cashback';

describe('cashback', () => {
  it('opens at the pickup, with no end date', () => {
    assert.equal(canGiveCashback({ status: 'active' }), true);
    assert.equal(canGiveCashback({ status: 'completed' }), true);
    assert.equal(canGiveCashback({ status: 'confirmed' }), false);
    assert.equal(canGiveCashback({ status: 'cancelled' }), false);
  });

  it('is given once', () => {
    const given = { id: 'c', booking_id: 'b', percent: 10, amount: 1, method: 'cash' as const, reason: 'x', given_by: 'u', given_at: '' };
    assert.equal(canGiveCashback({ status: 'completed', cashback: given }), false);
  });

  it('is a percent of the subtotal, rounded to a whole Rupiah', () => {
    assert.equal(cashbackAmount(500_000, 10), 50_000);
    assert.equal(cashbackAmount(485_555, 10), 48_556);
  });
});
