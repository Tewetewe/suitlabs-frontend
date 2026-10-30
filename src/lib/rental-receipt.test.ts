import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { Rental } from '../types';
import { rentalReceiptPricing } from './rental-receipt';
import { ThermalPrinterService } from './thermal-printer';

function photoRental(): Rental {
  return {
    id: 'rental-1', user_id: 'customer-1', rental_date: '2026-10-28', return_date: '2026-10-30',
    status: 'pending', total_cost: 300_000, security_deposit: 0, late_fee: 0, damage_charges: 0,
    created_by: 'staff-1', created_at: '', updated_at: '',
    items: [{ id: 'ri-1', rental_id: 'rental-1', item_id: 'trousers-1', quantity: 1,
      unit_price: 100_000, total_price: 100_000, created_at: '', updated_at: '' }],
    booking: {
      id: 'booking-1', customer_id: 'customer-1', booking_date: '2026-10-28', booking_guarantee: '',
      total_amount: 300_000, final_amount: 300_000, discount_amount: 0, paid_amount: 0, remaining_amount: 300_000,
      status: 'confirmed', payment_status: 'pending', created_by: 'staff-1', created_at: '', updated_at: '',
      invoice_number: 'INV-1', package_pricing_id: 'pkg-1',
      package_pricing: { id: 'pkg-1', package_name: 'Custom Suit Package', price: 200_000,
        duration_hours: 72, duration_days: 3, is_active: true, created_at: '', updated_at: '' },
      items: [{ id: 'bi-1', booking_id: 'booking-1', item_id: 'trousers-1', quantity: 1,
        unit_price: 100_000, total_price: 100_000, final_price: 100_000, discount_amount: 0, is_addon: true }],
      custom_lines: [
        { name: 'Black Suit XL (Double Breasted)', quantity: 1, unit_price: 0, total_price: 0 },
        { name: 'Black Tie', quantity: 1, unit_price: 0, total_price: 0 },
      ],
    },
  };
}

it('shows the missing package charge alongside the named custom items from the photo', () => {
  const { lines, subtotal } = rentalReceiptPricing(photoRental());
  assert.equal(lines[0].name, 'Custom Suit Package');
  assert.equal(lines[0].total, 200_000);
  assert.deepEqual(lines.slice(2).map((line) => [line.name, line.included]), [
    ['Black Suit XL (Double Breasted)', true], ['Black Tie', true],
  ]);
  assert.equal(subtotal, 300_000);
});

it('prints the package name, price and reconciled subtotal through the thermal route', async () => {
  const printer = new ThermalPrinterService();
  let printed = '';
  printer.print = async (bytes) => { printed = new TextDecoder().decode(bytes); };
  await printer.printRentalInvoice(photoRental());
  const text = printed.replace(/\s+/g, ' ');
  for (const expected of ['Custom Suit Package', '1 x Rp 200.000 = Rp 200.000',
    'Black Suit XL (Double Breasted)', 'Black Tie', 'Subtotal: Rp 300.000', 'GRAND TOTAL: Rp 300.000']) {
    assert.ok(text.includes(expected), `missing ${expected} in ${text}`);
  }
});

it('keeps a saved package price and charges only add-ons, with the saved discount', () => {
  const rental = photoRental();
  const booking = rental.booking!;
  booking.package_pricing!.price = 900_000;
  booking.discount_amount = 20_000;
  rental.total_cost = 330_000;
  booking.total_amount = 350_000;
  booking.custom_lines!.push({ name: 'Pocket square', quantity: 2, unit_price: 25_000, total_price: 50_000, is_addon: true });
  rental.items!.push({ id: 'ri-2', rental_id: rental.id, item_id: 'suit-1', quantity: 1,
    unit_price: 400_000, total_price: 400_000, created_at: '', updated_at: '' });
  booking.items!.push({ id: 'bi-2', booking_id: booking.id, item_id: 'suit-1', quantity: 1,
    unit_price: 400_000, total_price: 400_000, final_price: 400_000, discount_amount: 0 });
  const receipt = rentalReceiptPricing(rental);
  assert.equal(receipt.lines[0].total, 200_000);
  assert.equal(receipt.lines[2].included, true);
  assert.equal(receipt.subtotal, 350_000);
  assert.equal(receipt.subtotal - receipt.discount, rental.total_cost);
});

it('prints named and priced custom lines without a package', () => {
  const rental = photoRental();
  delete rental.booking!.package_pricing_id;
  rental.booking!.custom_lines = [{ name: 'Custom Black Suit', quantity: 2, unit_price: 100_000, total_price: 200_000 }];
  const receipt = rentalReceiptPricing(rental);
  assert.deepEqual(receipt.lines[1], { name: 'Custom Black Suit', quantity: 2, unitPrice: 100_000, total: 200_000, included: false });
  assert.equal(receipt.subtotal, 300_000);
});

it('retains the saved charge when a package is unavailable or a legacy rental has no lines', () => {
  const rental = photoRental();
  delete rental.booking!.package_pricing;
  let receipt = rentalReceiptPricing(rental);
  assert.equal(receipt.lines[0].name, 'Suit Rental Package');
  assert.equal(receipt.lines[0].total, 200_000);
  delete rental.booking;
  rental.items = [];
  receipt = rentalReceiptPricing(rental);
  assert.equal(receipt.lines[0].total, 300_000);
  assert.equal(receipt.subtotal, 300_000);
});
