import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { currentMonthRange, nextDaysRange } from './date';

describe('nextDaysRange', () => {
  it('gives today only for 0 days', () => {
    assert.deepEqual(nextDaysRange(0, new Date(2026, 9, 26, 15)), { from: '2026-10-26', to: '2026-10-26' });
  });

  it('crosses the end of the month', () => {
    assert.deepEqual(nextDaysRange(7, new Date(2026, 9, 26)), { from: '2026-10-26', to: '2026-11-02' });
  });
});

describe('currentMonthRange', () => {
  it('gives the first and the last day of the month', () => {
    assert.deepEqual(currentMonthRange(new Date(2026, 10, 15)), { from: '2026-11-01', to: '2026-11-30' });
  });
});
