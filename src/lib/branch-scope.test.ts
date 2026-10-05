import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultBranch, receiptHours, receiptPhone } from './branch-scope';

describe('defaultBranch', () => {
  it('opens Jimbaran first, whatever the order of the list', () => {
    const rows = [
      { id: 'b-2', code: 'nusadua' },
      { id: 'b-1', code: 'jimbaran' },
    ];
    assert.equal(defaultBranch(rows)?.id, 'b-1');
  });

  it('reads the code without case or spaces', () => {
    assert.equal(defaultBranch([{ id: 'b-9', code: 'x' }, { id: 'b-1', code: ' Jimbaran ' }])?.id, 'b-1');
  });

  it('falls back to the first shop without Jimbaran, and to nothing without shops', () => {
    assert.equal(defaultBranch([{ id: 'b-2', code: 'nusadua' }, { id: 'b-3', code: 'ubud' }])?.id, 'b-2');
    assert.equal(defaultBranch([]), undefined);
  });
});

describe('receipt contact details', () => {
  it('shows an Indonesian local number in international form', () => {
    assert.equal(receiptPhone('0812-3456-7890'), '+6281234567890');
    assert.equal(receiptPhone('+62 812 3456 7890'), '+6281234567890');
  });

  it('prints weekday and weekend hours on separate lines', () => {
    assert.deepEqual(receiptHours('MON-FRI: 12.00-20.00 | SAT-SUN: 12.00-18.00'), [
      'MON-FRI: 12.00-20.00',
      'SAT-SUN: 12.00-18.00',
    ]);
  });
});
