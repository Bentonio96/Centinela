/**
 * Flujo de incidentes en tiempo real.
 *
 * Un almacén observable fuera de React: los componentes se suscriben con
 * `useSyncExternalStore`. Vive aquí y no en un hook porque el intervalo debe
 * sobrevivir a los montajes y desmontajes de cualquier componente concreto.
 *
 * **Arranca detenido, y eso es deliberado.** El dataset base es determinista y
 * de él dependen las capturas del README y las comprobaciones de `verify`; si
 * el flujo empezara solo, cada ejecución vería datos distintos y ninguna de las
 * dos cosas sería reproducible. El modo en vivo es una capa opcional sobre un
 * cimiento que no se mueve.
 */

import type { Incident } from '@/types';
import { createIncident, GENERATED_AT, INCIDENTS, NEXT_SEQUENCE } from './incidents';
import { createRng, randomInt, type Rng } from './random';

/** Separación entre incidentes, en milisegundos. */
const MIN_INTERVAL_MS = 3_500;
const MAX_INTERVAL_MS = 7_000;

/** Cuánto se resalta una fila recién llegada. */
const HIGHLIGHT_MS = 4_000;

export interface LiveState {
  readonly incidents: readonly Incident[];
  readonly running: boolean;
  /**
   * Identificadores llegados hace poco, para resaltarlos.
   * Va en el estado y no en cada componente porque el resalte debe apagarse
   * solo, tanto en la tabla como en la lista de tarjetas.
   */
  readonly recentIds: readonly string[];
  /**
   * Instante de referencia para métricas y gráficos.
   *
   * Con el flujo detenido es el momento en que se generó el dataset; con el
   * flujo activo avanza, porque si no los incidentes que van entrando caerían
   * fuera de la ventana de 30 días y no aparecerían en ningún gráfico.
   */
  readonly now: number;
}

const INITIAL_STATE: LiveState = {
  incidents: INCIDENTS,
  running: false,
  recentIds: [],
  now: GENERATED_AT,
};

let state: LiveState = INITIAL_STATE;
let sequence = NEXT_SEQUENCE;
let rng: Rng | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const highlightTimers = new Set<ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function emit(next: LiveState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function forgetHighlight(id: string): void {
  emit({ ...state, recentIds: state.recentIds.filter((value) => value !== id) });
}

function pushIncident(): void {
  // La semilla se fija al arrancar, así una sesión concreta sigue siendo
  // reproducible aunque el conjunto ya no sea el mismo entre sesiones.
  rng ??= createRng(Date.now() % 2_147_483_647);

  const now = new Date();
  const incident = createIncident(rng, now, now, sequence);
  sequence += 1;

  emit({
    ...state,
    // Al principio de la lista: el orden por defecto es el más reciente primero.
    incidents: [incident, ...state.incidents],
    recentIds: [...state.recentIds, incident.id],
    now: now.getTime(),
  });

  const highlightTimer = setTimeout(() => {
    highlightTimers.delete(highlightTimer);
    forgetHighlight(incident.id);
  }, HIGHLIGHT_MS);
  highlightTimers.add(highlightTimer);

  scheduleNext();
}

/** Intervalo irregular: un ritmo exacto delataría de inmediato que es simulado. */
function scheduleNext(): void {
  timer = setTimeout(pushIncident, randomInt(rng ?? createRng(1), MIN_INTERVAL_MS, MAX_INTERVAL_MS));
}

function start(): void {
  if (timer !== null) return;
  emit({ ...state, running: true });
  scheduleNext();
}

function stop(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  for (const highlightTimer of highlightTimers) {
    clearTimeout(highlightTimer);
  }
  highlightTimers.clear();

  // El resalte se apaga al detener: si no, quedaría congelado en pantalla
  // porque su temporizador acaba de cancelarse.
  emit({ ...state, running: false, recentIds: [] });
}

export const liveFeed = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Devuelve siempre la misma referencia mientras nada cambie, que es lo que
   * `useSyncExternalStore` necesita para no renderizar en bucle.
   */
  getSnapshot(): LiveState {
    return state;
  },

  toggle(): void {
    if (state.running) stop();
    else start();
  },

  stop,
} as const;
