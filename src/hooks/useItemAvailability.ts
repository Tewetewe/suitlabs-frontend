'use client';

import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api';
import { availabilityNote } from '@/lib/item-availability';
import type { ItemAvailability } from '@/types';

// The backend takes at most 200 Item IDs at a time.
const BATCH_SIZE = 200;

/**
 * Whether Items are free from pickup to return (YYYY-MM-DD shop days). The
 * cashier and the booking form use it. excludeBookingId leaves out the booking
 * being edited, so it does not clash with itself.
 */
export function useItemAvailability(pickup: string, ret?: string, excludeBookingId?: string) {
  const [results, setResults] = useState<Record<string, ItemAvailability>>({});
  const resultsRef = useRef(results);
  resultsRef.current = results;
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

  // A list page asks for all its Items in one request. The booking being
  // edited is not left out here: lists show every booking.
  const checkMany = useCallback((itemIds: string[]) => {
    if (!pickup || excludeBookingId) return;
    const missing = Array.from(new Set(itemIds)).filter((id) => id && !requests.current.has(keyFor(id)));
    for (let start = 0; start < missing.length; start += BATCH_SIZE) {
      const ids = missing.slice(start, start + BATCH_SIZE);
      const request = apiClient.getItemsAvailability(ids, pickup, end).then(
        (byId) => {
          setResults((prev) => {
            const next = { ...prev };
            for (const id of ids) if (byId[id]) next[keyFor(id)] = byId[id];
            return next;
          });
          return null;
        },
        () => {
          for (const id of ids) requests.current.delete(keyFor(id));
          return null;
        },
      );
      for (const id of ids) {
        requests.current.set(keyFor(id), request.then(() => resultsRef.current[keyFor(id)] ?? null));
      }
    }
  }, [pickup, end, excludeBookingId, keyFor]);

  const resultFor = useCallback((itemId: string): ItemAvailability | undefined => results[keyFor(itemId)], [results, keyFor]);

  const noteFor = useCallback((itemId: string) => {
    const result = results[keyFor(itemId)];
    return result ? availabilityNote(result) : null;
  }, [results, keyFor]);

  return { check, checkMany, resultFor, noteFor };
}
