import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  bookingGross,
  bookingItemsChanged,
  bookingPayNow,
  defaultTrousersCode,
  halfDownPayment,
  newBookingStatuses,
  repriceForLength,
  spreadDiscount,
  typedSubtotal,
} from './booking-draft';

describe('bookingPayNow', () => {
  it('takes half for a down payment, rounded up', () => {
    assert.equal(halfDownPayment(150_001), 75_001);
    assert.equal(bookingPayNow({ total: 800_000, downPayment: true }), 400_000);
  });

  it('takes a typed down payment, capped at the total', () => {
    assert.equal(bookingPayNow({ total: 800_000, downPayment: true, typedDownPayment: 250_000 }), 250_000);
    assert.equal(bookingPayNow({ total: 800_000, downPayment: true, typedDownPayment: 900_000 }), 800_000);
  });

  it('takes all of the total for a full payment', () => {
    assert.equal(bookingPayNow({ total: 800_000, downPayment: false, typedDownPayment: 100_000 }), 800_000);
  });

  it('never lowers money already paid on an edit', () => {
    assert.equal(bookingPayNow({ total: 1_000_000, downPayment: true, alreadyPaid: 300_000 }), 300_000);
    assert.equal(bookingPayNow({ total: 1_000_000, downPayment: true, typedDownPayment: 100_000, alreadyPaid: 300_000 }), 300_000);
  });
});

describe('typedSubtotal and bookingGross', () => {
  it('charges the extra above the Items and flags a lower Subtotal', () => {
    assert.deepEqual(typedSubtotal(0, 500_000), { tooLow: false, extra: 0 });
    assert.deepEqual(typedSubtotal(600_000, 500_000), { tooLow: false, extra: 100_000 });
    assert.deepEqual(typedSubtotal(400_000, 500_000), { tooLow: true, extra: 0 });
  });

  it('prices a package with its add-ons, or the Items with the extra', () => {
    assert.equal(bookingGross({ packagePrice: 1_000_000, addonSubtotal: 50_000, itemsSubtotal: 700_000, extra: 99 }), 1_050_000);
    assert.equal(bookingGross({ packagePrice: 0, addonSubtotal: 0, itemsSubtotal: 700_000, extra: 100_000 }), 800_000);
  });
});

describe('newBookingStatuses', () => {
  it('confirms a booking that took money', () => {
    assert.deepEqual(newBookingStatuses(0, 500_000), { status: 'pending', payment_status: 'pending' });
    assert.deepEqual(newBookingStatuses(250_000, 500_000), { status: 'confirmed', payment_status: 'partial' });
    assert.deepEqual(newBookingStatuses(500_000, 500_000), { status: 'confirmed', payment_status: 'completed' });
  });
});

describe('spreadDiscount', () => {
  it('splits in proportion and never takes more than a line', () => {
    assert.deepEqual(spreadDiscount([300_000, 100_000], 40_000), [30_000, 10_000]);
    assert.deepEqual(spreadDiscount([100_000], 500_000), [100_000]);
  });
});

describe('repriceForLength', () => {
  const suit = { standard_price: 300_000, four_hour_price: 150_000 };
  it('moves lines still at the old price and keeps typed prices', () => {
    const lines = [{ id: 'a', unit_price: 300_000 }, { id: 'b', unit_price: 280_000 }];
    const next = repriceForLength(lines, () => suit, '3d', '4h');
    assert.deepEqual(next.map((line) => line.unit_price), [150_000, 280_000]);
  });
});

describe('defaultTrousersCode', () => {
  it('pairs only a Suit or a Jacket', () => {
    assert.equal(defaultTrousersCode({ type: 'suit', trousers_code: 'TR-1' }), 'TR-1');
    assert.equal(defaultTrousersCode({ type: 'jacket', trousers_code: 'TR-2' }), 'TR-2');
    assert.equal(defaultTrousersCode({ type: 'shirt', trousers_code: 'TR-3' }), '');
    assert.equal(defaultTrousersCode(undefined), '');
  });
});

describe('bookingItemsChanged', () => {
  it('sees a swap or a new quantity, not a new order', () => {
    const before = [{ item_id: 'suit', quantity: 1 }, { item_id: 'tie', quantity: 1 }];
    assert.equal(bookingItemsChanged(before, [{ item_id: 'tie', quantity: 1 }, { item_id: 'suit', quantity: 1 }]), false);
    assert.equal(bookingItemsChanged(before, [{ item_id: 'suit-2', quantity: 1 }, { item_id: 'tie', quantity: 1 }]), true);
    assert.equal(bookingItemsChanged(before, [{ item_id: 'suit', quantity: 2 }, { item_id: 'tie', quantity: 1 }]), true);
  });
});
