'use client';

import { useEffect } from 'react';

const FIELD = 'input, textarea, select, [contenteditable="true"]';

function isEditable(el: EventTarget | null): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.matches(FIELD)) return false;
  if (el instanceof HTMLInputElement) {
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'hidden', 'range', 'color'].includes(el.type);
  }
  return true;
}

function syncInset() {
  const vv = window.visualViewport;
  const height = vv?.height ?? window.innerHeight;
  const top = vv?.offsetTop ?? 0;
  const inset = Math.max(0, window.innerHeight - height - top);
  const root = document.documentElement;
  root.style.setProperty('--keyboard-inset', `${inset}px`);
  root.style.setProperty('--vv-height', `${height}px`);
  root.style.setProperty('--vv-top', `${top}px`);
  root.classList.toggle('keyboard-open', inset > 64);
}

function scrollFieldIntoView(el: HTMLElement) {
  const vv = window.visualViewport;
  const vvTop = vv?.offsetTop ?? 0;
  const vvBottom = vvTop + (vv?.height ?? window.innerHeight);
  const rect = el.getBoundingClientRect();
  const topGap = 16;
  const bottomGap = 28;
  if (rect.top >= vvTop + topGap && rect.bottom <= vvBottom - bottomGap) return;

  let parent: HTMLElement | null = el.parentElement;
  while (parent && parent !== document.body) {
    const style = getComputedStyle(parent);
    const scrollable =
      (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') &&
      parent.scrollHeight > parent.clientHeight + 8;
    if (scrollable) {
      const parentRect = parent.getBoundingClientRect();
      const visibleTop = Math.max(parentRect.top, vvTop) + topGap;
      const visibleBottom = Math.min(parentRect.bottom, vvBottom) - bottomGap;
      const mid = (visibleTop + visibleBottom) / 2;
      const current = rect.top + Math.min(rect.height, 48) / 2;
      parent.scrollTo({ top: parent.scrollTop + (current - mid) });
      return;
    }
    parent = parent.parentElement;
  }

  el.scrollIntoView({ block: 'center', inline: 'nearest' });
}

/**
 * Keeps the focused field above the on-screen keyboard on phones/tablets.
 * Uses visualViewport (iOS/Android) plus interactive-widget=resizes-content.
 */
export default function KeyboardAvoid() {
  useEffect(() => {
    syncInset();

    const vv = window.visualViewport;
    const onViewport = () => {
      syncInset();
      const el = document.activeElement;
      if (isEditable(el)) {
        window.requestAnimationFrame(() => scrollFieldIntoView(el));
      }
    };

    vv?.addEventListener('resize', onViewport);
    vv?.addEventListener('scroll', onViewport);
    window.addEventListener('resize', onViewport);

    try {
      const vk = (navigator as Navigator & { virtualKeyboard?: { overlaysContent: boolean } }).virtualKeyboard;
      if (vk) vk.overlaysContent = false;
    } catch {
      /* VirtualKeyboard API is optional */
    }

    let timer = 0;
    const onFocusIn = (event: FocusEvent) => {
      if (!isEditable(event.target)) return;
      const el = event.target;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        syncInset();
        scrollFieldIntoView(el);
      }, 320);
    };

    document.addEventListener('focusin', onFocusIn);

    return () => {
      window.clearTimeout(timer);
      vv?.removeEventListener('resize', onViewport);
      vv?.removeEventListener('scroll', onViewport);
      window.removeEventListener('resize', onViewport);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, []);

  return null;
}
