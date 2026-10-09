'use client';

import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { availabilityNote } from '@/lib/item-availability';
import type { ItemAvailability } from '@/types';

/**
 * Whether Items are free from pickup to return (YYYY-MM-DD shop days). The
 * cashier and the booking form use it. excludeBookingId leaves out the booking
 * being edited, so it does not clash with itself.
 */
export function useItemAvailability(pickup: string, ret?: string, excludeBookingId?: string) {
  const [results, setResults] = useState<Record<string, ItemAvailability>>({});
  const requests = useRef(new Map<string, Promise<ItemAvailability | null>>());
  const end = ret || pickup;

  const keyFor = useCallback(
    (itemId: string) => `${itemId}|${pickup}|${end}|${excludeBookingId || ''}`,
    [pickup, end, excludeBookingId],
  );

  // Asks once per Item and dates; later calls share the answer.
  const check = useCallback((itemId: string): Promise<ItemAvailability | null> => {
    if (!itemId || !pickup) return Promise.resolve(null);
    const key = keyFor(itemId);
    const pending = requests.current.get(key);
    if (pending) return pending;
    const request = apiClient
      .getItemAvailability(itemId, pickup, end, excludeBookingId)
      .then((result) => {
        setResults((prev) => ({ ...prev, [key]: result }));
        return result;
      })
      .catch(() => {
        requests.current.delete(key);
        return null;
      });
    requests.current.set(key, request);
    return request;
  }, [keyFor, pickup, end, excludeBookingId]);

  const noteFor = useCallback((itemId: string) => {
    const result = results[keyFor(itemId)];
    return result ? availabilityNote(result) : null;
  }, [results, keyFor]);

  return { check, noteFor };
}
