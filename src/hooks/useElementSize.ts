/**
 * Ancho de un elemento, observado.
 *
 * Los gráficos se dibujan en píxeles reales en vez de estirar un `viewBox`:
 * estirar deforma el texto de los ejes y engorda los trazos de forma desigual.
 * Para eso hay que saber cuánto mide el contenedor, y volver a saberlo cuando
 * cambia.
 */

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export function useElementWidth<T extends HTMLElement>(): readonly [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (node === null) return;

    setWidth(node.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, width] as const;
}
