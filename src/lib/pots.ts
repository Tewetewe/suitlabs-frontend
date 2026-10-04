/**
 * Pots: where the shop's money sits. Same rule as the backend (entity/pot.go):
 * cash always lands in the Cash Drawer; any other payment names the bank
 * account it went to, BCA or BNI. A non-cash payment with no Pot lands in
 * Bank (unassigned), which Admin clears with a Pot Transfer.
 */

import type { Pot } from '@/types';

export const BANK_POTS: { value: 'bca' | 'bni'; label: string }[] = [
  { value: 'bca', label: 'BCA' },
  { value: 'bni', label: 'BNI' },
];

const POT_LABELS: Record<Pot, string> = {
  cash: 'Cash Drawer',
  bca: 'Bank BCA',
  bni: 'Bank BNI',
  bank: 'Bank (unassigned)',
};

export function potLabel(pot?: string | null): string {
  return POT_LABELS[(pot || '') as Pot] || '—';
}

/** True for any method that is not cash: transfer, QRIS, debit, credit card. */
export function isNonCashMethod(method?: string | null): boolean {
  const m = String(method ?? '')
    .trim()
    .toLowerCase()
    .replace(/^dp_/, '')
    .replace(/^full_/, '');
  return m !== '' && m !== 'cash';
}

/** A non-cash payment must name BCA or BNI before it is saved. */
export function potMissing(method?: string | null, pot?: string | null): boolean {
  return isNonCashMethod(method) && pot !== 'bca' && pot !== 'bni';
}

/** The value to send: the bank for a non-cash payment, nothing for cash. */
export function potForRequest(method?: string | null, pot?: string | null): string | undefined {
  return isNonCashMethod(method) && (pot === 'bca' || pot === 'bni') ? pot : undefined;
}

export const POT_MISSING_MESSAGE = 'Pick the bank the money went to: BCA or BNI.';
