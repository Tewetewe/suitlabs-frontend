import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickupState, returnState, sortReturns } from './today-lists';

describe('pickupState', () => {
  it('reads Ready, Problem, or Not ready', () => {
    assert.equal(pickupState('ready').label, 'Ready');
    assert.equal(pickupState('problem').label, 'Problem');
    assert.equal(pickupState('not_started').label, 'Not ready');
    assert.equal(pickupState('in_progress').label, 'Not ready');
  });
});

describe('returnState', () => {
  it('reads Returned, late, or not back yet', () => {
    assert.equal(returnState({ status: 'returned', days_overdue: 2 }).label, 'Returned');
    assert.equal(returnState({ status: 'checked', days_overdue: 1 }).label, '1 day late');
    assert.equal(returnState({ status: 'not_started', days_overdue: 3 }).label, '3 days late');
    assert.equal(returnState({ status: 'in_progress', days_overdue: 0 }).label, 'Not back yet');
  });
});

describe('sortReturns', () => {
  it('puts late first, then the ones to come, then the ones back', () => {
    const sorted = sortReturns([
      { id: 'back', status: 'returned' as const, days_overdue: 0 },
      { id: 'due', status: 'not_started' as const, days_overdue: 0 },
      { id: 'late1', status: 'not_started' as const, days_overdue: 1 },
      { id: 'late3', status: 'checked' as const, days_overdue: 3 },
    ]);
    assert.deepEqual(sorted.map((c) => c.id), ['late3', 'late1', 'due', 'back']);
  });
});
