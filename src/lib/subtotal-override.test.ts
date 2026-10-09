import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unitPricesForSubtotal } from './subtotal-override';

describe('unitPricesForSubtotal', () => {
  it('puts the extra on the main single-quantity line', () => {
    const lines = [{ quantity: 1, unit_price: 150_000 }, { quantity: 1, unit_price: 50_000 }];
    assert.deepEqual(unitPricesForSubtotal(lines, 275_000), [225_000, 50_000]);
  });

  it('prefers a single-quantity line over a larger line of many', () => {
    const lines = [{ quantity: 3, unit_price: 100_000 }, { quantity: 1, unit_price: 80_000 }];
    assert.deepEqual(unitPricesForSubtotal(lines, 400_000), [100_000, 100_000]);
  });

  it('spreads the extra over the units when every line has many', () => {
    const lines = [{ quantity: 2, unit_price: 100_000 }];
    assert.deepEqual(unitPricesForSubtotal(lines, 250_000), [125_000]);
  });

  it('changes nothing at or below the catalogue subtotal', () => {
    const lines = [{ quantity: 1, unit_price: 150_000 }];
    assert.deepEqual(unitPricesForSubtotal(lines, 150_000), [150_000]);
    assert.deepEqual(unitPricesForSubtotal(lines, 100_000), [150_000]);
    assert.deepEqual(unitPricesForSubtotal([], 100_000), []);
  });
});
