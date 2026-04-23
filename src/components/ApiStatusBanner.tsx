'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { onAPIStatus, type APIStatusDetail } from '@/lib/api-status';
import clsx from 'clsx';

export default function ApiStatusBanner() {
  const [detail, setDetail] = useState<APIStatusDetail | null>(null);

  useEffect(() => {
    return onAPIStatus((d) => setDetail(d));
  }, []);

  const isOffline = detail?.online === false;
  const message = useMemo(() => {
    if (!isOffline) return null;
    const base = detail.baseURL;
    // Keep it very simple and actionable for dev + ops.
    return `Backend offline (${base}). Start the API server and refresh.`;
  }, [detail, isOffline]);

  if (!isOffline || !message) return null;

  return (
    <div className="fixed top-2 left-1/2 z-[60] -translate-x-1/2 px-3 w-full max-w-lg">
      <div
        className={clsx(
          'rounded-xl border px-3 py-2 shadow-sm backdrop-blur',
          'bg-amber-50/95 border-amber-200 text-amber-900'
        )}
        role="status"
        aria-live="polite"
      >
        <div className="text-sm font-semibold">Connection problem</div>
        <div className="text-sm">{message}</div>
      </div>
    </div>
  );
}

