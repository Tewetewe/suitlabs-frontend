import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ItemAvailabilityHit } from '@/types';
import { availabilityCardNote, availabilityNote } from './item-availability';

const hit = (kind: ItemAvailabilityHit['kind'], pickup: string, ret: string, name = 'Budi', reference = 'INV-1'): ItemAvailabilityHit => ({
  kind, source: 'booking', id: `${kind}-${pickup}`, customer_name: name, reference, pickup_date: pickup, return_date: ret,
});

describe('availabilityCardNote', () => {
  it('has no line for a free Item', () => {
    assert.equal(availabilityCardNote({ status: 'available', hits: [] }), null);
    assert.equal(availabilityCardNote(undefined), null);
  });

  it('greys a booked Item with the dates and the first name', () => {
    const note = availabilityCardNote({ status: 'booked', hits: [hit('booked', '2026-11-05', '2026-11-06', 'Andi Wijaya', 'INV-9')] });
    assert.equal(note?.tone, 'clash');
    assert.equal(note?.short, 'Booked 5–6 Nov · Andi');
    assert.equal(note?.detail, 'Pickup 5 Nov, return 6 Nov: Andi Wijaya (INV-9)');
  });

  it('writes a range across months in full', () => {
    const note = availabilityCardNote({ status: 'booked', hits: [hit('booked', '2026-10-30', '2026-11-02')] });
    assert.equal(note?.short, 'Booked 30 Oct–2 Nov · Budi');
  });

  it('says when the Item comes back for a same-day handover', () => {
    const evening = availabilityCardNote({ status: 'handover', hits: [hit('pickup_evening', '2026-11-10', '2026-11-12')] });
    assert.equal(evening?.short, 'Returns 12 Nov · pick up evening');
    const morning = availabilityCardNote({ status: 'handover', hits: [hit('return_morning', '2026-11-14', '2026-11-16')] });
    assert.equal(morning?.short, 'Picked up 14 Nov · return morning');
  });
});

describe('availabilityNote', () => {
  it('says the Item is free', () => {
    assert.deepEqual(availabilityNote({ status: 'available', hits: [] }), { tone: 'ok', text: 'Available on these dates' });
  });

  it('says to pick up in the evening when another booking returns it that day', () => {
    const note = availabilityNote({ status: 'handover', hits: [hit('pickup_evening', '2026-11-03', '2026-11-05')] });
    assert.equal(note.tone, 'note');
    assert.equal(note.text, 'Available, pick up in the evening: Budi (INV-1) returns it that day');
  });

  it('says to return in the morning when another booking picks it up that day', () => {
    const note = availabilityNote({ status: 'handover', hits: [hit('return_morning', '2026-11-07', '2026-11-09', 'Sari', '')] });
    assert.equal(note.text, 'Available, return in the morning: Sari picks it up that day');
  });

  it('names the clash first, and counts the others', () => {
    const note = availabilityNote({
      status: 'booked',
      hits: [hit('pickup_evening', '2026-11-03', '2026-11-05'), hit('booked', '2026-11-05', '2026-11-06', 'Andi', 'INV-9'), hit('booked', '2026-11-06', '2026-11-06')],
    });
    assert.equal(note.tone, 'clash');
    assert.equal(note.text, 'Booked 5 Nov–6 Nov by Andi (INV-9) and 1 more');
  });

  it('shows one day for a single-day booking', () => {
    const note = availabilityNote({ status: 'booked', hits: [hit('booked', '2026-11-06', '2026-11-06', '')] });
    assert.equal(note.text, 'Booked 6 Nov by another customer (INV-1)');
  });
});

describe('an Item with more than one unit', () => {
  const oneOfTwo = { status: 'available' as const, stock: 2, free: 1, hits: [hit('booked', '2026-11-05', '2026-11-06', 'Andi Wijaya', 'INV-9')] };

  it('stays available and says how many units are free', () => {
    assert.deepEqual(availabilityNote(oneOfTwo), { tone: 'ok', text: 'Available on these dates, 1 of 2 free' });
  });

  it('does not grey the card while a unit is free', () => {
    const note = availabilityCardNote(oneOfTwo);
    assert.equal(note?.tone, 'note');
    assert.equal(note?.short, '1 of 2 free');
    assert.equal(note?.detail, 'Pickup 5 Nov, return 6 Nov: Andi Wijaya (INV-9)');
  });

  it('is booked when every unit is held', () => {
    const note = availabilityNote({ ...oneOfTwo, status: 'booked', free: 0 });
    assert.equal(note.tone, 'clash');
  });
});
