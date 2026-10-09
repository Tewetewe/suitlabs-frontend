import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ItemAvailabilityHit } from '@/types';
import { availabilityNote } from './item-availability';

const hit = (kind: ItemAvailabilityHit['kind'], pickup: string, ret: string, name = 'Budi', reference = 'INV-1'): ItemAvailabilityHit => ({
  kind, source: 'booking', id: `${kind}-${pickup}`, customer_name: name, reference, pickup_date: pickup, return_date: ret,
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
