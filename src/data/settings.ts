/**
 * Preferencias de quien usa la consola, persistidas en `localStorage`.
 *
 * Es un almacén observable fuera de React por la misma razón que el de
 * incidentes: lo leen componentes que no comparten ancestro cercano (la barra
 * lateral, el calendario, los avisos) y pasarlo por props obligaría a que medio
 * árbol conociera ajustes que no usa.
 *
 * Todo lo que se lee del almacenamiento se valida contra el dominio antes de
 * aceptarse. `localStorage` es editable desde la consola del navegador y puede
 * traer un JSON de otra versión: un valor desconocido cae al valor por defecto
 * en lugar de propagar un tipo mentiroso.
 */

import { DEFAULT_ANALYST, isAnalystName } from './team';

export const ACCENTS = ['forest', 'ocean', 'plum', 'ember'] as const;
export type Accent = (typeof ACCENTS)[number];

export const WEEK_STARTS = ['monday', 'sunday'] as const;
export type WeekStart = (typeof WEEK_STARTS)[number];

export interface Settings {
  readonly accent: Accent;
  readonly weekStart: WeekStart;
  /** Con qué analista se usa la consola: define "Mis casos" y firma los cambios. */
  readonly me: string;
  /** Avisos flotantes cuando el flujo en vivo trae un incidente crítico. */
  readonly criticalToasts: boolean;
  /** Avisos de confirmación al cambiar el estado o el responsable de un caso. */
  readonly actionToasts: boolean;
}

export const SETTINGS_STORAGE_KEY = 'centinela:settings';

/**
 * Clave de la versión anterior, que sólo guardaba el tema.
 *
 * Ya no hay tema que elegir —la consola es clara, siempre—, así que no se lee:
 * se borra. Por el mismo motivo se ignora un `theme` que pudiera quedar dentro
 * del JSON de ajustes de una versión intermedia.
 */
const LEGACY_THEME_KEY = 'centinela:theme';

export const DEFAULT_SETTINGS: Settings = {
  accent: 'forest',
  weekStart: 'monday',
  me: DEFAULT_ANALYST,
  criticalToasts: true,
  actionToasts: true,
};

function oneOf<T extends string>(values: readonly T[], candidate: unknown, fallback: T): T {
  return values.find((value) => value === candidate) ?? fallback;
}

function readStored(): Settings {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? '{}');
    const stored: Record<string, unknown> =
      typeof raw === 'object' && raw !== null ? { ...raw } : {};

    localStorage.removeItem(LEGACY_THEME_KEY);

    return {
      accent: oneOf(ACCENTS, stored['accent'], DEFAULT_SETTINGS.accent),
      weekStart: oneOf(WEEK_STARTS, stored['weekStart'], DEFAULT_SETTINGS.weekStart),
      me:
        typeof stored['me'] === 'string' && isAnalystName(stored['me'])
          ? stored['me']
          : DEFAULT_SETTINGS.me,
      criticalToasts:
        typeof stored['criticalToasts'] === 'boolean'
          ? stored['criticalToasts']
          : DEFAULT_SETTINGS.criticalToasts,
      actionToasts:
        typeof stored['actionToasts'] === 'boolean'
          ? stored['actionToasts']
          : DEFAULT_SETTINGS.actionToasts,
    };
  } catch {
    // Modo privado, cookies bloqueadas o JSON corrupto: una preferencia no es
    // un dato crítico, se sigue con los valores por defecto.
    return DEFAULT_SETTINGS;
  }
}

function persist(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Preferencia no persistida: la sesión actual sigue funcionando igual.
  }
}

/**
 * Refleja el acento en `<html>`.
 *
 * El script en línea de `index.html` ya hizo esto antes del primer pintado;
 * repetirlo aquí es idempotente y cubre los cambios posteriores.
 */
function applyToDocument(settings: Settings): void {
  const root = document.documentElement;

  if (settings.accent === 'forest') {
    delete root.dataset['accent'];
  } else {
    root.dataset['accent'] = settings.accent;
  }
}

let state: Settings = readStored();
applyToDocument(state);

const listeners = new Set<() => void>();

function commit(next: Settings): void {
  state = next;
  applyToDocument(next);
  persist(next);
  for (const listener of listeners) {
    listener();
  }
}

export const settingsStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): Settings {
    return state;
  },

  update(patch: Partial<Settings>): void {
    commit({ ...state, ...patch });
  },

  reset(): void {
    commit(DEFAULT_SETTINGS);
  },
} as const;
