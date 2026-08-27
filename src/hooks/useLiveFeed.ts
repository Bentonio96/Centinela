/**
 * Suscripción al flujo de incidentes en tiempo real.
 *
 * `useSyncExternalStore` es la vía correcta aquí: el almacén vive fuera de
 * React y cambia por su cuenta, así que React necesita saber cómo suscribirse y
 * cómo leerlo de forma consistente durante el render.
 */

import { useSyncExternalStore } from 'react';

import { liveFeed, type LiveState } from '@/data/liveFeed';

export function useLiveFeed(): LiveState & { readonly toggle: () => void } {
  const state = useSyncExternalStore(liveFeed.subscribe, liveFeed.getSnapshot, liveFeed.getSnapshot);

  return { ...state, toggle: liveFeed.toggle };
}
