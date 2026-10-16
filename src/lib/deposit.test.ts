import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { depositHeld, depositLeft, refundableDeposit } from './deposit';

describe('deposit', () => {
  const rental = {
    security_deposit: 2_000_000,
    deposit_applied_to_sales: 1_500_000,
    damage_charges: 200_000,
    deposit_collected_at: '2026-10-10',
  };

  it('takes lost-item Sales off first, then damage', () => {
    assert.equal(depositLeft(rental), 500_000);
    assert.equal(refundableDeposit(rental), 300_000);
    assert.equal(refundableDeposit(rental, 900_000), 0);
  });

  it('is held only between collection and release', () => {
    assert.equal(depositHeld(rental), true);
    assert.equal(depositHeld({ ...rental, deposit_refunded_at: '2026-10-20' }), false);
    assert.equal(depositHeld({ ...rental, deposit_collected_at: null }), false);
  });
});
