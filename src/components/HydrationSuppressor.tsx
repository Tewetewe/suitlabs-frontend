'use client';

import { useHydration } from '@/hooks/useHydration';

function argText(args: unknown[]): string {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return `${arg.message} ${arg.stack ?? ''}`;
      return '';
    })
    .join(' ');
}

function isExtensionHydrationNoise(args: unknown[]): boolean {
  const text = argText(args);
  // React 19 says "hydrated", older builds said "hydration" / "Hydration failed".
  // Dashlane (and similar extensions) inject data-* attrs before React hydrates.
  return /hydrat|data-dashlane|dashlane-classification|did not match|didn't match/i.test(text);
}

if (typeof window !== 'undefined') {
  const w = window as Window & { __suitlabsHydrationGuard?: boolean };
  if (!w.__suitlabsHydrationGuard) {
    w.__suitlabsHydrationGuard = true;
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (isExtensionHydrationNoise(args)) return;
      originalError.apply(console, args as []);
    };
  }
}

export default function HydrationSuppressor() {
  useHydration();
  return null;
}
