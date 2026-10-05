'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type CashierChrome = 'phone' | 'counter';

const STORAGE_KEY = 'suitlabs-cashier-layout';

type CashierChromeContextValue = {
  chrome: CashierChrome;
  setChrome: (next: CashierChrome) => void;
};

const CashierChromeContext = createContext<CashierChromeContextValue>({
  chrome: 'phone',
  setChrome: () => {},
});

function readStoredChrome(): CashierChrome | null {
  if (typeof window === 'undefined') return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === 'phone' || saved === 'counter') return saved;
  return null;
}

function chromeFromViewport(): CashierChrome {
  if (typeof window === 'undefined') return 'phone';
  return window.innerWidth < 900 ? 'phone' : 'counter';
}

export function CashierChromeProvider({ children }: { children: React.ReactNode }) {
  const [chrome, setChromeState] = useState<CashierChrome>('phone');

  useEffect(() => {
    setChromeState(readStoredChrome() ?? chromeFromViewport());
  }, []);

  const setChrome = useCallback((next: CashierChrome) => {
    setChromeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, []);

  return (
    <CashierChromeContext.Provider value={{ chrome, setChrome }}>
      {children}
    </CashierChromeContext.Provider>
  );
}

export function useCashierChrome() {
  return useContext(CashierChromeContext);
}
