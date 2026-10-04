'use client';

import React, { useEffect } from 'react';
import clsx from 'clsx';
import { formatCurrency } from '@/lib/currency';
import { useTransactionFeeRules } from '@/hooks/useTransactionFeeRules';
import { PotPicker } from '@/components/payments/PotPicker';
import {
  TRANSACTION_FEE_LABEL,
  feeMethodOf,
  feeRulesFor,
  formatFeeRate,
  pickFeeRule,
  ruleFee,
} from '@/lib/transaction-fee';

interface TransactionFeeLinesProps {
  /** The payment taken now, without the fee. */
  amount: number;
  method?: string | null;
  /** The bank the money went to. With onPotChange, the "Paid into" picker shows. */
  pot?: string;
  onPotChange?: (pot: string) => void;
  /** The rule Staff picked. Needed only when two or more rules are left for the method and the Pot. */
  ruleId?: string;
  onRuleIdChange?: (ruleId: string) => void;
  className?: string;
}

// TransactionFeeLines asks where a non-cash payment went (BCA or BNI), then
// shows the fee the customer pays on top of a QRIS or card payment and the
// amount the cashier enters on the EDC. The bank names the EDC, so it narrows
// the card rules; a second choice shows only when that bank still has two. It
// renders nothing for cash. The fee is never sent: the backend computes it
// again from the amount, the method, the Pot, and the rule id.
export function TransactionFeeLines({
  amount,
  method,
  pot,
  onPotChange,
  ruleId,
  onRuleIdChange,
  className,
}: TransactionFeeLinesProps) {
  const rules = useTransactionFeeRules();
  const candidates = feeRulesFor(rules, method, pot);
  const { rule, needsChoice } = pickFeeRule(rules, method, ruleId, pot);
  const fee = ruleFee(rule, amount);
  const isQris = feeMethodOf(method) === 'qris';

  // A pick for another method or bank would be refused by the backend, so it
  // is cleared.
  const stale = Boolean(ruleId) && !candidates.some((c) => c.id === ruleId);
  useEffect(() => {
    if (stale) onRuleIdChange?.('');
  }, [stale, onRuleIdChange]);

  const picker = onPotChange ? <PotPicker method={method} pot={pot} onChange={onPotChange} /> : null;
  if (candidates.length === 0) {
    return picker ? <div className={className}>{picker}</div> : null;
  }

  return (
    <div className={clsx('space-y-1', className)}>
      {picker}
      {candidates.length > 1 && onRuleIdChange && (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-700">Card</span>
          <select
            className={clsx(
              'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900',
              needsChoice ? 'border-amber-400' : 'border-slate-200',
            )}
            value={rule ? rule.id : ''}
            onChange={(e) => onRuleIdChange(e.target.value)}
            data-testid="fee-rule-select"
          >
            <option value="">Choose the card…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({formatFeeRate(c.rate_bps)})
              </option>
            ))}
          </select>
          {needsChoice && <span className="block text-xs text-amber-700">Pick the card to price the fee.</span>}
        </label>
      )}
      {fee > 0 && rule && (
        <>
          <div className="flex justify-between" data-testid="transaction-fee">
            <span>
              {TRANSACTION_FEE_LABEL} ({rule.label} {formatFeeRate(rule.rate_bps)})
            </span>
            <span className="tabular-nums">{formatCurrency(fee)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900" data-testid="transaction-charge">
            <span>{isQris ? 'Charge by QRIS' : 'Charge on EDC'}</span>
            <span className="tabular-nums">{formatCurrency(Math.round(amount) + fee)}</span>
          </div>
        </>
      )}
    </div>
  );
}
