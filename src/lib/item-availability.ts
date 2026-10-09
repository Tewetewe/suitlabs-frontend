import type { ItemAvailability, ItemAvailabilityHit } from '@/types';

export type AvailabilityTone = 'ok' | 'note' | 'clash';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-05" as "5 Nov". The value is a shop day, so it is read with no timezone. */
function shortDay(value: string): string {
  const [, month, day] = value.split('-').map(Number);
  return month && day ? `${day} ${MONTHS[month - 1]}` : value;
}

function who(hit: ItemAvailabilityHit): string {
  const name = hit.customer_name?.trim() || 'another customer';
  return hit.reference ? `${name} (${hit.reference})` : name;
}

/**
 * One line for the cashier about an Item on the chosen dates. A clash names
 * the other booking; a same-day handover says when to pick up or return.
 */
export function availabilityNote(availability: ItemAvailability): { tone: AvailabilityTone; text: string } {
  const hits = availability.hits || [];
  const clash = hits.find((hit) => hit.kind === 'booked');
  if (clash) {
    const more = hits.filter((hit) => hit.kind === 'booked').length - 1;
    const range = clash.pickup_date === clash.return_date
      ? shortDay(clash.pickup_date)
      : `${shortDay(clash.pickup_date)}–${shortDay(clash.return_date)}`;
    return {
      tone: 'clash',
      text: `Booked ${range} by ${who(clash)}${more > 0 ? ` and ${more} more` : ''}`,
    };
  }
  const evening = hits.find((hit) => hit.kind === 'pickup_evening');
  const morning = hits.find((hit) => hit.kind === 'return_morning');
  const notes = [
    evening && `pick up in the evening: ${who(evening)} returns it that day`,
    morning && `return in the morning: ${who(morning)} picks it up that day`,
  ].filter(Boolean);
  if (notes.length > 0) {
    return { tone: 'note', text: `Available, ${notes.join('; ')}` };
  }
  return { tone: 'ok', text: 'Available on these dates' };
}
