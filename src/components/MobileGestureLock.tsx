'use client';

import { useEffect } from 'react';

/**
 * Blocks pinch-zoom and other multi-touch gestures that steal taps on
 * shop tablets/phones. CSS + viewport meta are not enough on iOS Safari
 * and MIUI Chrome — those still fire gesture events.
 */
export default function MobileGestureLock() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();

    const blockPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
        return;
      }
      const scale = (event as TouchEvent & { scale?: number }).scale;
      if (typeof scale === 'number' && scale !== 1) {
        event.preventDefault();
      }
    };

    document.addEventListener('gesturestart', prevent, { passive: false });
    document.addEventListener('gesturechange', prevent, { passive: false });
    document.addEventListener('gestureend', prevent, { passive: false });
    document.addEventListener('touchmove', blockPinch, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('gestureend', prevent);
      document.removeEventListener('touchmove', blockPinch);
    };
  }, []);

  return null;
}
