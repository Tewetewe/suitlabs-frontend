import { useEffect, useRef } from 'react';

/**
 * Runs refresh every intervalMs while the tab is visible, and again when the
 * tab comes back into view. The daily lists use it so a screen left open on
 * the counter moves to the next day and picks up the 20:00 late day by itself.
 */
export function useAutoRefresh(refresh: () => void, intervalMs: number, enabled = true) {
  // Keep the newest callback without restarting the timer on each render.
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === 'visible') latest.current();
    };
    const timer = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, enabled]);
}
