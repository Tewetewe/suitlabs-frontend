import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { discountAmountFor, discountOptionLabel, discountRateLabel } from './discount';

describe('discountAmountFor', () => {
  it('takes a percentage of the bill', () => {
    assert.equal(
      discountAmountFor({ name: 'A', discount_type: 'percentage', discount_value: 15 }, 1_000_000),
      150_000,
    );
  });

  it('stops at the cap', () => {
    const d = {
      name: 'A',
      discount_type: 'percentage' as const,
      discount_value: 15,
      max_discount_amount: 100_000,
    };
    assert.equal(discountAmountFor(d, 1_000_000), 100_000);
  });

  it('never takes more than the bill', () => {
    const d = { name: 'A', discount_type: 'amount' as const, discount_value: 500_000 };
    assert.equal(discountAmountFor(d, 200_000), 200_000);
  });

  it('gives 0 on an empty bill, so the form shows no saving yet', () => {
    assert.equal(discountAmountFor({ name: 'A', discount_type: 'percentage', discount_value: 15 }, 0), 0);
  });
});

describe('discountRateLabel', () => {
  it('reads a percentage as a percentage and an amount as rupiah', () => {
    assert.equal(discountRateLabel({ name: 'A', discount_type: 'percentage', discount_value: 15 }), '15%');
    assert.equal(discountRateLabel({ name: 'A', discount_type: 'amount', discount_value: 50_000 }), 'Rp 50.000');
  });
});

describe('discountOptionLabel', () => {
  it('leads with the saving', () => {
    const d = { name: 'Wedding season', discount_type: 'percentage' as const, discount_value: 10 };
    assert.equal(discountOptionLabel(d, 2_000_000), 'Wedding season — 10% · takes off Rp 200.000');
  });

  it('names the code the customer must quote', () => {
    const d = {
      name: 'Coupon',
      discount_type: 'amount' as const,
      discount_value: 100_000,
      requires_code: true,
      code: 'WEDDING2026',
    };
    assert.equal(
      discountOptionLabel(d, 1_000_000),
      'Coupon — Rp 100.000 · takes off Rp 100.000 · needs code WEDDING2026',
    );
  });

  it('drops the saving while the booking has no items', () => {
    const d = { name: 'Wedding season', discount_type: 'percentage' as const, discount_value: 10 };
    assert.equal(discountOptionLabel(d, 0), 'Wedding season — 10%');
  });
});
