/**
 * Foco de luz que sigue al cursor dentro de un elemento.
 *
 * Devuelve una `ref` y los manejadores que hay que repartir sobre el nodo. La
 * posición se escribe **directamente en el estilo del elemento**, no en el
 * estado de React: un `mousemove` dispara decenas de eventos por segundo y
 * convertir cada uno en un render sería tirar trabajo a la basura para pintar
 * un degradado. El CSS de `.spotlight` lee esas dos variables y ya.
 *
 * El atributo `data-spot` controla la opacidad desde CSS en vez de montar y
 * desmontar el degradado, así entra y sale con transición.
 */

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface SpotlightHandlers {
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly onPointerLeave: () => void;
}

export function useSpotlight(): SpotlightHandlers {
  const ref = useRef<HTMLDivElement | null>(null);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const node = ref.current;
    if (node === null) return;

    // Un dedo sobre una pantalla táctil dejaría el foco clavado donde se
    // levantó; el efecto es de cursor y sólo tiene sentido con uno.
    if (event.pointerType !== 'mouse') return;

    const bounds = node.getBoundingClientRect();
    node.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`);
    node.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`);
    node.dataset['spot'] = 'on';
  }, []);

  const onPointerLeave = useCallback(() => {
    const node = ref.current;
    if (node === null) return;
    delete node.dataset['spot'];
  }, []);

  return { ref, onPointerMove, onPointerLeave };
}
