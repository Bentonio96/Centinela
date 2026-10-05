/**
 * Suscripciones a los almacenes externos de la aplicación.
 *
 * `useSyncExternalStore` es la vía correcta aquí: los almacenes viven fuera de
 * React y cambian por su cuenta —un temporizador, un `popstate`, otra vista—,
 * así que React necesita saber cómo suscribirse y cómo leerlos de forma
 * consistente durante el render.
 */

import { useSyncExternalStore } from 'react';

import { settingsStore, type Settings } from '@/data/settings';
import { incidentStore, type StoreState } from '@/data/store';
import { toasts, type Toast } from '@/data/toasts';
import { router, type View } from '@/lib/router';

export function useIncidentStore(): StoreState {
  return useSyncExternalStore(
    incidentStore.subscribe,
    incidentStore.getSnapshot,
    incidentStore.getSnapshot,
  );
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
    settingsStore.getSnapshot,
  );
}

export function useToasts(): readonly Toast[] {
  return useSyncExternalStore(toasts.subscribe, toasts.getSnapshot, toasts.getSnapshot);
}

export function useRoute(): View {
  return useSyncExternalStore(router.subscribe, router.getSnapshot, router.getSnapshot);
}
