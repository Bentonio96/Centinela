/**
 * Enrutador mínimo sobre la History API.
 *
 * Siete vistas con rutas fijas no justifican una librería: lo que hace falta es
 * leer `pathname`, escribirlo con `pushState` y avisar a quien esté suscrito.
 * Es un almacén externo más, consumido con `useSyncExternalStore`.
 *
 * Las rutas están en español porque la URL la lee una persona, igual que los
 * parámetros de filtro.
 */

export const VIEWS = [
  'panel',
  'incidentes',
  'tablero',
  'calendario',
  'analitica',
  'equipo',
  'ajustes',
] as const;
export type View = (typeof VIEWS)[number];

export const VIEW_PATH: Readonly<Record<View, string>> = {
  panel: '/',
  incidentes: '/incidentes',
  tablero: '/tablero',
  calendario: '/calendario',
  analitica: '/analitica',
  equipo: '/equipo',
  ajustes: '/ajustes',
};

/** Una ruta desconocida cae al panel en vez de dejar la pantalla vacía. */
export function parseView(pathname: string): View {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/u, '') : pathname;
  return VIEWS.find((view) => VIEW_PATH[view] === normalized) ?? 'panel';
}

/**
 * Parámetros que antes vivían en la raíz, cuando la tabla era toda la app.
 * `inc` no está: el detalle de un incidente se abre sobre cualquier vista.
 */
const LEGACY_FILTER_PARAMS = ['q', 'sev', 'cat', 'dia', 'estado', 'orden', 'p', 'resp'] as const;

/**
 * Mantiene vivos los enlaces compartidos antes de que existieran las vistas.
 *
 * `/?sev=critical` apuntaba a la tabla filtrada; hoy la raíz es el panel y esos
 * parámetros no significarían nada ahí. Se reescribe a `/incidentes?…` antes
 * del primer render, con `replaceState` para no dejar la URL vieja en el
 * historial.
 */
export function normalizeLegacyUrl(): void {
  if (parseView(window.location.pathname) !== 'panel') return;

  const params = new URLSearchParams(window.location.search);
  if (!LEGACY_FILTER_PARAMS.some((name) => params.has(name))) return;

  window.history.replaceState(
    window.history.state,
    '',
    `${VIEW_PATH.incidentes}${window.location.search}${window.location.hash}`,
  );
}

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export const router = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener('popstate', listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('popstate', listener);
    };
  },

  getSnapshot(): View {
    return parseView(window.location.pathname);
  },

  /**
   * Cambia de vista dejando una entrada en el historial.
   *
   * La query no se arrastra: cada vista escribe la suya. La de incidentes la
   * repone `useIncidents` en cuanto la ruta cambia, desde el estado en memoria.
   */
  navigate(view: View): void {
    if (parseView(window.location.pathname) === view) return;
    window.history.pushState(null, '', VIEW_PATH[view]);
    notify();
  },
} as const;
