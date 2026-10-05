'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';
import { DEFAULT_FEE_RULES } from '@/lib/transaction-fee';
import type { TransactionFeeRule } from '@/types';

// Every payment form on a page asks for the same rules, so one request serves
// them all. A failed load keeps the default QRIS rule; the backend prices the
// fee itself either way.
let cached: TransactionFeeRule[] | null = null;
let pending: Promise<TransactionFeeRule[]> | null = null;

function loadRules(): Promise<TransactionFeeRule[]> {
  if (!pending) {
    pending = apiClient
      .getTransactionFeeRules()
      .then((rules) => {
        cached = rules;
        return rules;
      })
      .catch((error) => {
        console.warn('Could not load transaction fee rules', error);
        pending = null;
        return DEFAULT_FEE_RULES;
      });
  }
  return pending;
}

/** Drop the cache after Admin changes a rule, so the next form loads the new rates. */
export function invalidateTransactionFeeRules() {
  cached = null;
  pending = null;
}

/** The active Transaction Fee Rules, or the default QRIS rule until they load. */
export function useTransactionFeeRules(): TransactionFeeRule[] {
  const [rules, setRules] = useState<TransactionFeeRule[]>(cached ?? DEFAULT_FEE_RULES);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    void loadRules().then((loaded) => {
      if (alive) setRules(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  return rules;
}
