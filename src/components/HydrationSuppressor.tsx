'use client';

import { useEffect } from 'react';
import { useHydration } from '@/hooks/useHydration';

export default function HydrationSuppressor() {
  useHydration();

  useEffect(() => {
    // Suppress hydration warnings for browser extensions
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && 
          (args[0].includes('hydration') || 
           args[0].includes('data-dashlane-rid') ||
           args[0].includes('Hydration failed'))) {
        return;
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  return null;
}
