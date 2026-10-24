import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defaultBankPot, isTransferMethod } from './pots';

describe('defaultBankPot', () => {
  it('picks BCA for a transfer with no bank yet', () => {
    assert.equal(defaultBankPot('transfer', ''), 'bca');
    assert.equal(defaultBankPot('dp_transfer', ''), 'bca');
    assert.equal(defaultBankPot('full_transfer', undefined), 'bca');
  });

  it('keeps a bank already picked', () => {
    assert.equal(defaultBankPot('transfer', 'bni'), '');
    assert.equal(defaultBankPot('transfer', 'bca'), '');
  });

  it('leaves QRIS, card and cash empty', () => {
    assert.equal(defaultBankPot('qris', ''), '');
    assert.equal(defaultBankPot('full_cc', ''), '');
    assert.equal(defaultBankPot('cash', ''), '');
    assert.equal(defaultBankPot('dp_cash', ''), '');
  });
});

describe('isTransferMethod', () => {
  it('reads the DP and full variants', () => {
    assert.equal(isTransferMethod('dp_transfer'), true);
    assert.equal(isTransferMethod('qris'), false);
  });
});
