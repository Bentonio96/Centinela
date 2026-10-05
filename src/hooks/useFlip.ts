/**
 * Animación FLIP para listas que se reordenan.
 *
 * Cuando una tarjeta cambia de columna o un filtro deja huecos, el navegador
 * la teletransporta a su sitio nuevo. FLIP (First, Last, Invert, Play) mide
 * dónde estaba cada elemento antes del cambio y dónde quedó después, y anima
 * la diferencia: la tarjeta *viaja*, y el ojo entiende qué se movió.
 *
 * Los elementos se identifican con `data-flip`. Se usa la Web Animations API
 * directamente sobre el nodo, sin pasar por el estado de React: son
 * transformaciones de un fotograma a otro que React no necesita conocer.
 */

import { useLayoutEffect, useRef, type RefObject } from 'react';

import { usePrefersReducedMotion } from './useMediaQuery';

const MOVE_MS = 380;
const ENTER_MS = 260;
const EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * @param signature Cualquier valor que cambie cuando cambia el orden o el
 * conjunto de elementos. Mientras sea el mismo no se mide nada.
 */
export function useFlip<T extends HTMLElement>(signature: string): RefObject<T | null> {
  const containerRef = useRef<T | null>(null);
  const positions = useRef(new Map<string, DOMRect>());
  const mounted = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    const next = new Map<string, DOMRect>();
    const nodes = container.querySelectorAll<HTMLElement>('[data-flip]');

    for (const node of nodes) {
      const key = node.dataset['flip'];
      if (key === undefined) continue;

      const rect = node.getBoundingClientRect();
      next.set(key, rect);

      // El primer pintado ya tiene su propia entrada escalonada.
      if (!mounted.current || reducedMotion) continue;

      const previous = positions.current.get(key);
      if (previous === undefined) {
        node.animate(
          [
            { opacity: 0, transform: 'scale(0.96)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: ENTER_MS, easing: EASING },
        );
        continue;
      }

      const dx = previous.left - rect.left;
      const dy = previous.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;

      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration: MOVE_MS,
        easing: EASING,
      });
    }

    positions.current = next;
    mounted.current = true;
  }, [signature, reducedMotion]);

  return containerRef;
}
