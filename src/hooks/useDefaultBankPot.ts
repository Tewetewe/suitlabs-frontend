'use client';

import { useEffect } from 'react';
import { defaultBankPot } from '@/lib/pots';

/**
 * useDefaultBankPot picks BCA for a transfer while no bank is picked yet.
 * Staff can still tap BNI. A bank already picked or saved stays.
 */
export function useDefaultBankPot(
  method: string | null | undefined,
  pot: string,
  setPot: (pot: string) => void,
) {
  const fallback = defaultBankPot(method, pot);
  useEffect(() => {
    if (fallback && fallback !== pot) setPot(fallback);
  }, [fallback, pot, setPot]);
}
