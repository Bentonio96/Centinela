/**
 * Un reloj que provoca render a intervalos, para lo que cuenta el tiempo en
 * pantalla: el cronómetro del flujo en vivo y la cuenta atrás del traspaso.
 *
 * Con `intervalMs` en `null` no hay temporizador: un cronómetro en pausa no
 * tiene por qué despertar a React una vez por segundo para pintar lo mismo.
 */

import { useEffect, useState } from 'react';

export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs === null) return;

    const tick = () => {
      setNow(Date.now());
    };
    // Un tic inmediato: al reanudar, el valor guardado puede tener minutos.
    tick();
    const interval = setInterval(tick, intervalMs);
    return () => {
      clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
