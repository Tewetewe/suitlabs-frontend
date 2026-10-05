'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api';

// The shop's Security Deposit flag. SECURITY_DEPOSIT_PERCENT=0 on the backend
// turns it off, and then no screen offers a deposit button, menu, or text. A
// deposit already held still shows, so the shop can release it.
export type DepositSettings = { enabled: boolean; percent: number };

const OFF: DepositSettings = { enabled: false, percent: 0 };

// Every screen asks for the same flag, so one request serves them all. A
// failed load reads as off, because the backend refuses a deposit it does not
// take either way.
let cached: DepositSettings | null = null;
let pending: Promise<DepositSettings> | null = null;

function loadSettings(): Promise<DepositSettings> {
  if (!pending) {
    pending = apiClient
      .getDepositSettings()
      .then((settings) => {
        cached = { enabled: Boolean(settings.enabled), percent: settings.percent || 0 };
        return cached;
      })
      .catch((error) => {
        console.warn('Could not load deposit settings', error);
        pending = null;
        return OFF;
      });
  }
  return pending;
}

/** The shop's deposit flag. It reads as off until it loads. */
export function useDepositSettings(): DepositSettings {
  const [settings, setSettings] = useState<DepositSettings>(cached ?? OFF);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    void loadSettings().then((loaded) => {
      if (alive) setSettings(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  return settings;
}
