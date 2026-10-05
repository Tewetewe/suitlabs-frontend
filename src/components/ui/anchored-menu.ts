'use client';

import { CSSProperties, RefObject, useLayoutEffect, useState } from 'react';

/** Position a menu in a portal so overflow:auto parents do not clip it. */
export function useAnchoredMenu(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  maxHeight = 256,
  align: 'start' | 'end' = 'start',
  minWidth = 160,
) {
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - r.bottom - gap;
      const spaceAbove = r.top - gap;
      const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const height = Math.max(120, Math.min(maxHeight, openUp ? spaceAbove : spaceBelow));
      const width = Math.max(minWidth, r.width);
      const preferredLeft = align === 'end' ? r.right - width : r.left;
      const left = Math.min(Math.max(8, preferredLeft), window.innerWidth - width - 8);

      setStyle({
        position: 'fixed',
        left,
        width,
        zIndex: 80,
        maxHeight: height,
        ...(openUp
          ? { bottom: window.innerHeight - r.top + gap, top: 'auto' }
          : { top: r.bottom + gap, bottom: 'auto' }),
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, anchorRef, maxHeight, align, minWidth]);

  return style;
}
