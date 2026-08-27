/**
 * Suscripción a una media query.
 *
 * Usa `useSyncExternalStore` en vez de `useState` + `useEffect` porque el
 * tamaño de la ventana es estado externo a React: así no hay un primer render
 * con el valor equivocado ni desincronización si la consulta cambia.
 */

import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onStoreChange);
      return () => {
        mediaQueryList.removeEventListener('change', onStoreChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);

  // El tercer argumento cubre el render en servidor, donde no hay `window`.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/**
 * Punto de corte entre la tabla y las tarjetas apiladas.
 * Coincide con `md` de Tailwind (768px) para que el layout no se parta en dos
 * criterios distintos.
 */
export const TABLE_BREAKPOINT = '(min-width: 768px)';

/**
 * Preferencia de movimiento reducido del sistema.
 *
 * El CSS ya la respeta con su bloque `@media`, pero las animaciones de Recharts
 * las calcula JavaScript y no las alcanza ninguna regla de estilo: hay que
 * apagarlas explícitamente.
 */
export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(REDUCED_MOTION);
}
