import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { missingFourHourPrice, rentalPrice, rentalWindow } from './rental-window';

describe('rentalWindow', () => {
  it('picks up a 3-day rental the day before the event and returns it the day after', () => {
    assert.deepEqual(rentalWindow('2026-10-10', '3d'), { pickup: '2026-10-09', ret: '2026-10-11' });
  });

  it('picks up and returns a 4-hour rental on the event day', () => {
    assert.deepEqual(rentalWindow('2026-10-10', '4h'), { pickup: '2026-10-10', ret: '2026-10-10' });
  });

  it('crosses a month and a year', () => {
    assert.deepEqual(rentalWindow('2026-11-01', '3d'), { pickup: '2026-10-31', ret: '2026-11-02' });
    assert.deepEqual(rentalWindow('2026-12-31', '3d'), { pickup: '2026-12-30', ret: '2027-01-01' });
  });
});

describe('rentalPrice', () => {
  const suit = { standard_price: 500_000, four_hour_price: 300_000 };

  it('charges the 3-day price for 3 days and the 4-hour price for 4 hours', () => {
    assert.equal(rentalPrice(suit, '3d'), 500_000);
    assert.equal(rentalPrice(suit, '4h'), 300_000);
    assert.equal(missingFourHourPrice(suit, '4h'), false);
  });

  it('falls back to the 3-day price when an Item has no 4-hour price', () => {
    const noFourHour = { standard_price: 500_000, four_hour_price: 0 };
    assert.equal(rentalPrice(noFourHour, '4h'), 500_000);
    assert.equal(missingFourHourPrice(noFourHour, '4h'), true);
    assert.equal(missingFourHourPrice(noFourHour, '3d'), false);
  });
});
