import type { ItemAvailability, ItemAvailabilityHit } from '@/types';

export type AvailabilityTone = 'ok' | 'note' | 'clash';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-05" as "5 Nov". The value is a shop day, so it is read with no timezone. */
function shortDay(value: string): string {
  const [, month, day] = value.split('-').map(Number);
  return month && day ? `${day} ${MONTHS[month - 1]}` : value;
}

/** "1 of 2 free" when the Item has more than one unit and another booking holds some. */
function unitsFree(availability: ItemAvailability): string | null {
  const stock = availability.stock ?? 1;
  if (stock <= 1 || (availability.hits || []).length === 0) return null;
  return `${availability.free ?? stock} of ${stock} free`;
}

function who(hit: ItemAvailabilityHit): string {
  const name = hit.customer_name?.trim() || 'another customer';
  return hit.reference ? `${name} (${hit.reference})` : name;
}

/**
 * The short line on an Item card in a list, with the full text for a tooltip.
 * A free Item has no line, so the list stays clean.
 */
export function availabilityCardNote(
  availability: ItemAvailability | undefined,
): { tone: AvailabilityTone; short: string; detail: string } | null {
  if (!availability) return null;
  const hits = availability.hits || [];
  const clash = availability.status === 'booked' ? hits.find((hit) => hit.kind === 'booked') : undefined;
  if (clash) {
    const name = clash.customer_name?.trim().split(/\s+/)[0] || 'booked';
    return {
      tone: 'clash',
      short: `Booked ${dayRange(clash.pickup_date, clash.return_date)} · ${name}`,
      detail: hits
        .filter((hit) => hit.kind === 'booked')
        .map((hit) => `Pickup ${shortDay(hit.pickup_date)}, return ${shortDay(hit.return_date)}: ${who(hit)}`)
        .join('\n'),
    };
  }
  const units = unitsFree(availability);
  if (units && availability.status === 'available') {
    return {
      tone: 'note',
      short: units,
      detail: hits
        .map((hit) => `Pickup ${shortDay(hit.pickup_date)}, return ${shortDay(hit.return_date)}: ${who(hit)}`)
        .join('\n'),
    };
  }
  const evening = hits.find((hit) => hit.kind === 'pickup_evening');
  if (evening) {
    return {
      tone: 'note',
      short: `Returns ${shortDay(evening.return_date)} · pick up evening`,
      detail: `${who(evening)} returns it on ${shortDay(evening.return_date)}. Pick it up in the evening.`,
    };
  }
  const morning = hits.find((hit) => hit.kind === 'return_morning');
  if (morning) {
    return {
      tone: 'note',
      short: `Picked up ${shortDay(morning.pickup_date)} · return morning`,
      detail: `${who(morning)} picks it up on ${shortDay(morning.pickup_date)}. Return it in the morning.`,
    };
  }
  return null;
}

/** "5–6 Nov", or "30 Oct–2 Nov" across months, or "5 Nov" for one day. */
function dayRange(pickup: string, ret: string): string {
  if (pickup === ret) return shortDay(pickup);
  const [, pm] = pickup.split('-');
  const [, rm] = ret.split('-');
  if (pm === rm) return `${Number(pickup.split('-')[2])}–${shortDay(ret)}`;
  return `${shortDay(pickup)}–${shortDay(ret)}`;
}

/**
 * One line for the cashier about an Item on the chosen dates. A clash names
 * the other booking; a same-day handover says when to pick up or return.
 */
export function availabilityNote(availability: ItemAvailability): { tone: AvailabilityTone; text: string } {
  const hits = availability.hits || [];
  const clash = availability.status === 'booked' ? hits.find((hit) => hit.kind === 'booked') : undefined;
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
  const units = unitsFree(availability);
  if (units && availability.status === 'available') {
    return { tone: 'ok', text: `Available on these dates, ${units}` };
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
