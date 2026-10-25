import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canGiveCashback, cashbackAmount, cashbackLastDay } from './cashback';

describe('cashback window', () => {
  const returned = {
    status: 'completed' as const,
    booking_date: '2026-10-09T00:00:00',
    rental: { actual_pickup_date: '2026-10-10T15:00:00' },
  };

  it('runs to 7 days after the actual pickup', () => {
    assert.equal(cashbackLastDay(returned), '2026-10-17');
    assert.equal(canGiveCashback(returned, new Date(2026, 9, 17, 23, 0)), true);
    assert.equal(canGiveCashback(returned, new Date(2026, 9, 18, 0, 1)), false);
  });

  it('lets Admin reconcile a completed booking past the window, not one still out', () => {
    const later = new Date(2026, 11, 20);
    assert.equal(canGiveCashback(returned, later, true), true);
    assert.equal(canGiveCashback(returned, later, false), false);
    assert.equal(canGiveCashback({ ...returned, status: 'active' }, later, true), false);
  });

  it('starts from the booking pickup date with no pickup recorded', () => {
    assert.equal(cashbackLastDay({ ...returned, rental: undefined }), '2026-10-16');
  });

  it('opens at the pickup, once', () => {
    const now = new Date(2026, 9, 12);
    assert.equal(canGiveCashback({ ...returned, status: 'active' }, now), true);
    assert.equal(canGiveCashback({ ...returned, status: 'confirmed' }, now), false);
    assert.equal(canGiveCashback({ ...returned, cashback: { id: 'c', booking_id: 'b', percent: 10, amount: 1, method: 'cash', reason: 'x', given_by: 'u', given_at: '' } }, now), false);
    assert.equal(canGiveCashback(returned, now), true);
  });
});

describe('cashback amount', () => {
  it('is a percent of the subtotal, rounded to a whole Rupiah', () => {
    assert.equal(cashbackAmount(500_000, 10), 50_000);
    assert.equal(cashbackAmount(485_555, 10), 48_556);
  });
});
