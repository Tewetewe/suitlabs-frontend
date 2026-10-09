'use client';

import { useEffect, useState } from 'react';

// Kept in memory only: a page opened again in the same tab gets its last
// value back, and a reload starts fresh.
const remembered = new Map<string, unknown>();

/**
 * useState that keeps its value while the user moves between pages, so a list
 * keeps its filters and search when the user comes back from a detail page.
 */
export function useRememberedState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    if (remembered.has(key)) return remembered.get(key) as T;
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    remembered.set(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
