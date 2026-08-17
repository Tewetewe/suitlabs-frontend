'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const LIST_PAGE_SIZE = 20;

export type InfinitePage<T> = {
  items: T[];
  hasMore: boolean;
  total?: number;
};

function itemKey<T>(item: T, index: number) {
  const id = (item as { id?: string }).id;
  return id || String(index);
}

export function hasNextPage(
  pagination?: { has_next?: boolean; page?: number; total_pages?: number },
  itemCount = 0,
  pageSize = LIST_PAGE_SIZE,
) {
  if (pagination?.has_next != null) return pagination.has_next;
  if (pagination?.page != null && pagination.total_pages != null) {
    return pagination.page < pagination.total_pages;
  }
  return itemCount >= pageSize;
}

export function useInfiniteList<T>(loadPage: (page: number) => Promise<InfinitePage<T>>) {
  const [items, setItems] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const requestRef = useRef(0);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (nextPage: number, append: boolean) => {
    if (append) {
      if (loadingMoreRef.current || !hasMoreRef.current) return;
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      requestRef.current += 1;
      setLoading(true);
      hasMoreRef.current = true;
    }
    const requestId = requestRef.current;
    try {
      const result = await loadPage(nextPage);
      if (requestId !== requestRef.current) return;
      setItems((prev) => {
        if (!append) return result.items;
        const seen = new Set(prev.map((item, index) => itemKey(item, index)));
        return [
          ...prev,
          ...result.items.filter((item, index) => !seen.has(itemKey(item, prev.length + index))),
        ];
      });
      hasMoreRef.current = result.hasMore;
      setHasMore(result.hasMore);
      setTotal(result.total ?? 0);
      pageRef.current = nextPage;
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  }, [loadPage]);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  const loadMore = useCallback(() => load(pageRef.current + 1, true), [load]);

  const reload = useCallback(() => load(1, false), [load]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || loading || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '320px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, loadMore, items.length]);

  return { items, setItems, loading, loadingMore, hasMore, total, reload, sentinelRef };
}
