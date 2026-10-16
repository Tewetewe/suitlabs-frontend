/**
 * The Today card on the Dashboard: the Pickups and the Returns of today, each
 * with one plain state. The work itself stays on Pickup Prep and Return Check.
 */
import type { PickupPrepStatus, ReturnCheck } from '@/types';

export type TodayTone = 'success' | 'danger' | 'warning' | 'default';

export type TodayState = { label: string; tone: TodayTone };

/** The prep state of a Pickup: Ready, Problem, or Not ready. */
export function pickupState(status: PickupPrepStatus): TodayState {
  if (status === 'ready') return { label: 'Ready', tone: 'success' };
  if (status === 'problem') return { label: 'Problem', tone: 'danger' };
  return { label: 'Not ready', tone: 'default' };
}

/** The state of a Return: Returned, late by some days, or still to come. */
export function returnState(check: Pick<ReturnCheck, 'status' | 'days_overdue'>): TodayState {
  if (check.status === 'returned') return { label: 'Returned', tone: 'success' };
  if (check.days_overdue > 0) {
    return { label: `${check.days_overdue} ${check.days_overdue === 1 ? 'day' : 'days'} late`, tone: 'danger' };
  }
  return { label: 'Not back yet', tone: 'warning' };
}

/** Late Returns first, then the ones still to come, then the ones back. */
export function sortReturns<T extends Pick<ReturnCheck, 'status' | 'days_overdue'>>(checks: T[]): T[] {
  const rank = (check: T) => (check.status === 'returned' ? 2 : check.days_overdue > 0 ? 0 : 1);
  return [...checks].sort((a, b) => rank(a) - rank(b) || b.days_overdue - a.days_overdue);
}
