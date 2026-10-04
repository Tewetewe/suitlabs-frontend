/**
 * The fee a customer pays on top of a QRIS, debit, or credit card payment.
 *
 * Same rule as the backend (entity/transaction_fee.go): Admin keeps one rule
 * per EDC terminal and card kind, because BCA and BNI charge different MDR.
 * A rule charges its rate on a payment above its minimum, rounded up to whole
 * rupiah. The shop does not book the fee as revenue; the cashier sees it
 * before charging and the receipt prints it. The backend computes the fee
 * itself from the method and the chosen rule, so the fee is never sent.
 */

import type { FeeMethod, TransactionFeeRule } from '@/types';

export const TRANSACTION_FEE_LABEL = 'Transaction fee';

/** For a form where the amount is not known until the backend prices it. */
export const TRANSACTION_FEE_HINT = 'QRIS and card payments may add a transaction fee on top.';

/** The schedule before the rules load: QRIS above Rp 500.000 at 0.3%. */
export const DEFAULT_FEE_RULES: TransactionFeeRule[] = [
  {
    id: 'default-qris',
    method: 'qris',
    terminal: '',
    label: 'QRIS',
    rate_bps: 30,
    min_amount: 500000,
    active: true,
    sort_order: 0,
  },
];

/** `qris` / `debit` / `cc` from a sale method or a booking method (`dp_cc`); '' for cash and transfer. */
export function feeMethodOf(method?: string | null): FeeMethod | '' {
  const m = String(method ?? '')
    .trim()
    .toLowerCase()
    .replace(/^dp_/, '')
    .replace(/^full_/, '');
  return m === 'qris' || m === 'debit' || m === 'cc' ? m : '';
}

/** `qris` for a sale or tender, `dp_qris` / `full_qris` for a booking. */
export function isQrisMethod(method?: string | null): boolean {
  return feeMethodOf(method) === 'qris';
}

/**
 * The active rules that can price a payment made with `method` into `pot`. A
 * bank Pot keeps only that bank's EDC rules, plus rules for any terminal (QRIS).
 */
export function feeRulesFor(rules: TransactionFeeRule[], method?: string | null, pot?: string | null): TransactionFeeRule[] {
  const feeMethod = feeMethodOf(method);
  if (!feeMethod) return [];
  const bank = pot === 'bca' || pot === 'bni' ? pot : '';
  return rules.filter(
    (rule) => rule.active && rule.method === feeMethod && (!rule.terminal || !bank || rule.terminal === bank),
  );
}

/**
 * The rule for one payment. With two or more active rules, Staff must pick the
 * terminal: `needsChoice` is true until `ruleId` names one of them.
 */
export function pickFeeRule(
  rules: TransactionFeeRule[],
  method?: string | null,
  ruleId?: string | null,
  pot?: string | null,
): { rule: TransactionFeeRule | null; needsChoice: boolean } {
  const candidates = feeRulesFor(rules, method, pot);
  if (ruleId) {
    const chosen = candidates.find((rule) => rule.id === ruleId);
    if (chosen) return { rule: chosen, needsChoice: false };
  }
  if (candidates.length === 1) return { rule: candidates[0], needsChoice: false };
  return { rule: null, needsChoice: candidates.length > 1 };
}

/** Integer arithmetic, so Rp 600.000 at 30 bps gives exactly Rp 1.800. */
export function ruleFee(rule: TransactionFeeRule | null | undefined, amount: number): number {
  if (!rule || rule.rate_bps <= 0) return 0;
  const a = Math.round(Number(amount) || 0);
  if (a <= 0 || a <= rule.min_amount) return 0;
  return Math.floor((a * rule.rate_bps + 9999) / 10000);
}

/** The fee on one payment of `amount` made with `method`. 0 until a needed terminal is chosen. */
export function transactionFee(
  amount: number,
  method?: string | null,
  rules: TransactionFeeRule[] = DEFAULT_FEE_RULES,
  ruleId?: string | null,
  pot?: string | null,
): number {
  return ruleFee(pickFeeRule(rules, method, ruleId, pot).rule, amount);
}

/** `0.3%`, `2%`, `0.15%`. */
export function formatFeeRate(rateBps: number): string {
  return `${Number((rateBps / 100).toFixed(2))}%`;
}
