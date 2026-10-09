'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBranch } from '@/contexts/BranchContext';

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

type ListSnapshot = {
  items: unknown[];
  page: number;
  hasMore: boolean;
  total: number;
  scrollY: number;
};

// Kept in memory only: a list opened again in the same tab shows the rows it
// had and its scroll position, and a reload starts fresh.
const listSnapshots = new Map<string, ListSnapshot>();

type InfiniteListOptions = {
  /**
   * Names the list and everything its loadPage reads (filters, search). A list
   * with a key keeps its rows and scroll position when the user comes back from
   * a detail page. The current shop is added to the key here.
   */
  cacheKey?: string;
};

export function useInfiniteList<T>(
  loadPage: (page: number) => Promise<InfinitePage<T>>,
  { cacheKey }: InfiniteListOptions = {},
) {
  const { currentBranchId } = useBranch();
  const snapshotKey = cacheKey ? `${cacheKey}@${currentBranchId ?? 'all'}` : null;
  const [restored] = useState(() => (snapshotKey ? listSnapshots.get(snapshotKey) ?? null : null));
  const [items, setItems] = useState<T[]>(() => (restored?.items as T[] | undefined) ?? []);
  const [hasMore, setHasMore] = useState(restored?.hasMore ?? true);
  const [total, setTotal] = useState(restored?.total ?? 0);
  const [loading, setLoading] = useState(!restored);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const requestRef = useRef(0);
  const pageRef = useRef(restored?.page ?? 1);
  const hasMoreRef = useRef(restored?.hasMore ?? true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // The key the restored rows belong to. While it holds, the first load is
  // skipped; any other key loads page 1 again.
  const restoredKeyRef = useRef(restored ? snapshotKey : null);
  const scrollYRef = useRef(restored?.scrollY ?? 0);

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
    if (snapshotKey && restoredKeyRef.current === snapshotKey) return;
    restoredKeyRef.current = null;
    void load(1, false);
  }, [load, snapshotKey]);

  // Remember the rows, and the scroll position, for the next visit.
  useEffect(() => {
    if (!snapshotKey || loading) return;
    listSnapshots.set(snapshotKey, {
      items, page: pageRef.current, hasMore, total, scrollY: scrollYRef.current,
    });
  }, [snapshotKey, loading, items, hasMore, total]);

  useEffect(() => {
    if (!snapshotKey) return;
    // Opening a detail page scrolls the window to the top, and this listener can
    // still hear it. Only a scroll on the list's own URL counts.
    const listPath = window.location.pathname;
    const onScroll = () => {
      if (window.location.pathname !== listPath) return;
      scrollYRef.current = window.scrollY;
      const snapshot = listSnapshots.get(snapshotKey);
      if (snapshot) snapshot.scrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [snapshotKey]);

  // Back on a remembered list: scroll to where the user left it. The second
  // try covers the router's own scroll to the top after the page shows.
  useEffect(() => {
    if (!restored) return;
    const y = restored.scrollY;
    const frame = requestAnimationFrame(() => window.scrollTo(0, y));
    const timer = setTimeout(() => window.scrollTo(0, y), 120);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [restored]);

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
