/**
 * Anima un número desde su valor anterior hasta el nuevo.
 *
 * Existe por una razón concreta: en un tablero que se actualiza solo, un
 * número que salta de 25 a 26 no se percibe. Recorrer la distancia hace que el
 * ojo lo cace. Al montar arranca desde cero, que es de donde sale el efecto de
 * "contador" del primer pintado.
 *
 * Quien haya pedido menos movimiento recibe el valor final directamente, sin
 * un solo fotograma intermedio: aquí no basta con acortar la animación, porque
 * un número cambiando es justamente el tipo de movimiento que molesta. Esa
 * decisión se resuelve *durante el render* devolviendo `target`, y no con un
 * `setState` dentro de un efecto, que provocaría un segundo render para llegar
 * al mismo sitio.
 */

import { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from './useMediaQuery';

const DURATION_MS = 700;

/** Frenada suave: rápida al principio y detenida al final. */
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

export function useCountUp(target: number): number {
  const reducedMotion = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;

    const from = fromRef.current;
    if (from === target) return;

    let frame = 0;
    const startedAt = performance.now();

    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / DURATION_MS, 1);
      const current = from + (target - from) * easeOut(progress);

      fromRef.current = current;
      setValue(current);

      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        // Aterrizar en el valor exacto: interpolar deja residuos decimales que
        // al redondear pueden mostrar un número distinto del real.
        fromRef.current = target;
        setValue(target);
      }
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, reducedMotion]);

  return reducedMotion ? target : value;
}
