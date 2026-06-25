import { useRef } from 'react';
import type { TouchEvent as ReactTouchEvent } from 'react';

const SWIPE_MIN_X = 60; // minimalny poziomy dystans gestu (px)
const SWIPE_MAX_MS = 700; // gest musi być w miarę szybki (nie przeciąganie)
const HORIZONTAL_RATIO = 1.7; // |dx| musi być tyle razy większe od |dy| (inaczej to scroll w pionie)

/**
 * Czy gest rozpoczęty na tym elemencie ma być zignorowany przez nawigację swipem.
 * Pomijamy: mapę (Leaflet sam obsługuje przeciąganie), nakładki oznaczone
 * `data-swipe-ignore` oraz kontenery przewijane w poziomie (np. rzędy chipów).
 */
function blocksHorizontalSwipe(target: EventTarget | null, root: HTMLElement): boolean {
  let node: HTMLElement | null = target instanceof HTMLElement ? target : null;
  while (node && node !== root) {
    if (node.classList?.contains('leaflet-container')) return true;
    if (node.dataset && node.dataset.swipeIgnore !== undefined) return true;
    const ox = window.getComputedStyle(node).overflowX;
    if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth + 4) return true;
    node = node.parentElement;
  }
  return false;
}

/** Nawigacja między ekranami przez przesunięcie palcem w bok. */
export function useSwipeNav(opts: { enabled: boolean; onNext: () => void; onPrev: () => void }) {
  const start = useRef<{ x: number; y: number; t: number; ok: boolean } | null>(null);

  return {
    onTouchStart: (e: ReactTouchEvent<HTMLElement>) => {
      if (!opts.enabled || e.touches.length !== 1) {
        start.current = null;
        return;
      }
      const t = e.touches[0];
      start.current = {
        x: t.clientX,
        y: t.clientY,
        t: Date.now(),
        ok: !blocksHorizontalSwipe(e.target, e.currentTarget),
      };
    },
    onTouchEnd: (e: ReactTouchEvent<HTMLElement>) => {
      const s = start.current;
      start.current = null;
      if (!s || !s.ok || !opts.enabled) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Date.now() - s.t > SWIPE_MAX_MS) return;
      if (Math.abs(dx) < SWIPE_MIN_X) return;
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;
      if (dx < 0) opts.onNext();
      else opts.onPrev();
    },
  };
}
