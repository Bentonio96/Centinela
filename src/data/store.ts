/**
 * Almacén de incidentes: el dataset base, el flujo en tiempo real y los cambios
 * que hace quien usa la consola.
 *
 * Es un almacén observable fuera de React; los componentes se suscriben con
 * `useSyncExternalStore`. Vive aquí y no en un hook porque el intervalo del
 * flujo debe sobrevivir a los montajes y desmontajes de cualquier vista, y
 * porque un cambio hecho en el tablero tiene que verse en el panel sin que
 * ambos compartan nada más que este módulo.
 *
 * **El flujo arranca detenido, y eso es deliberado.** El dataset base es
 * determinista y de él dependen las capturas del README y las comprobaciones de
 * `verify`; si el flujo empezara solo, cada ejecución vería datos distintos y
 * ninguna de las dos cosas sería reproducible.
 *
 * Los cambios viven en memoria: recargar devuelve el dataset de siempre. Es un
 * proyecto sin backend, y persistir ediciones sobre datos que se regeneran con
 * fechas relativas a hoy produciría incidentes "resueltos" antes de existir.
 */

import type {
  AffectedAsset,
  Incident,
  IncidentCategory,
  IncidentEvent,
  IncidentStatus,
  Severity,
} from '@/types';
import { createIncident, GENERATED_AT, INCIDENTS, NEXT_SEQUENCE } from './incidents';
import { createRng, randomInt, type Rng } from './random';

/** Separación entre incidentes del flujo, en milisegundos. */
const MIN_INTERVAL_MS = 3_500;
const MAX_INTERVAL_MS = 7_000;

/** Cuánto se resalta una fila recién llegada. */
const HIGHLIGHT_MS = 4_000;

export interface LiveSession {
  /** Instante en que se reanudó el flujo, o `null` si está en pausa. */
  readonly since: number | null;
  /** Tiempo acumulado en tramos anteriores a la pausa actual. */
  readonly accumulatedMs: number;
  /** Incidentes que ha traído el flujo desde el último reinicio. */
  readonly received: number;
}

export interface StoreState {
  readonly incidents: readonly Incident[];
  readonly running: boolean;
  /**
   * Identificadores llegados o creados hace poco, para resaltarlos.
   * Va en el estado y no en cada componente porque el resalte debe apagarse
   * solo, tanto en la tabla como en el tablero.
   */
  readonly recentIds: readonly string[];
  /**
   * Instante de referencia para métricas y gráficos.
   *
   * Con el dataset intacto es el momento en que se generó; cada llegada o
   * cambio lo adelanta, porque si no un incidente recién resuelto quedaría
   * "en el futuro" de los indicadores y no contaría en ninguno.
   */
  readonly now: number;
  readonly live: LiveSession;
}

const IDLE_LIVE: LiveSession = { since: null, accumulatedMs: 0, received: 0 };

const INITIAL_STATE: StoreState = {
  incidents: INCIDENTS,
  running: false,
  recentIds: [],
  now: GENERATED_AT,
  live: IDLE_LIVE,
};

let state: StoreState = INITIAL_STATE;
let sequence = NEXT_SEQUENCE;
let rng: Rng | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const highlightTimers = new Set<ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function emit(next: StoreState): void {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

function highlight(id: string): void {
  const highlightTimer = setTimeout(() => {
    highlightTimers.delete(highlightTimer);
    emit({ ...state, recentIds: state.recentIds.filter((value) => value !== id) });
  }, HIGHLIGHT_MS);
  highlightTimers.add(highlightTimer);
}

function clearHighlights(): void {
  for (const highlightTimer of highlightTimers) {
    clearTimeout(highlightTimer);
  }
  highlightTimers.clear();
}

function pushLiveIncident(): void {
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
    live: { ...state.live, received: state.live.received + 1 },
  });

  highlight(incident.id);
  scheduleNext();
}

/** Intervalo irregular: un ritmo exacto delataría de inmediato que es simulado. */
function scheduleNext(): void {
  timer = setTimeout(
    pushLiveIncident,
    randomInt(rng ?? createRng(1), MIN_INTERVAL_MS, MAX_INTERVAL_MS),
  );
}

function startLive(): void {
  if (timer !== null) return;
  emit({ ...state, running: true, live: { ...state.live, since: Date.now() } });
  scheduleNext();
}

/** Pausa: el cronómetro conserva lo acumulado y el flujo deja de traer casos. */
function pauseLive(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  clearHighlights();

  const { since, accumulatedMs } = state.live;
  emit({
    ...state,
    running: false,
    // El resalte se apaga al detener: si no, quedaría congelado en pantalla
    // porque su temporizador acaba de cancelarse.
    recentIds: [],
    live: {
      ...state.live,
      since: null,
      accumulatedMs: since === null ? accumulatedMs : accumulatedMs + (Date.now() - since),
    },
  });
}

/** Detiene y pone el cronómetro a cero. Los incidentes ya recibidos se quedan. */
function resetLive(): void {
  pauseLive();
  emit({ ...state, live: IDLE_LIVE });
}

/** Reemplaza un incidente por su versión modificada y adelanta el reloj. */
function replaceIncident(
  id: string,
  update: (incident: Incident, nowIso: string) => Incident,
): void {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let changed = false;

  const incidents = state.incidents.map((incident) => {
    if (incident.id !== id) return incident;
    const next = update(incident, nowIso);
    changed = changed || next !== incident;
    return next;
  });

  if (changed) {
    emit({ ...state, incidents, now: Math.max(state.now, now) });
  }
}

function appendEvent(incident: Incident, event: IncidentEvent): readonly IncidentEvent[] {
  return [...incident.timeline, event];
}

export interface IncidentDraft {
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
  readonly category: IncidentCategory;
  readonly assignee: string;
  readonly asset: AffectedAsset;
  /** Quién lo registra; firma la primera entrada de la bitácora. */
  readonly reporter: string;
}

function createManualIncident(draft: IncidentDraft): Incident {
  const now = new Date();
  const nowIso = now.toISOString();

  const incident: Incident = {
    id: `INC-${now.getFullYear()}-${String(sequence).padStart(4, '0')}`,
    title: draft.title,
    description: draft.description,
    severity: draft.severity,
    status: 'open',
    category: draft.category,
    detectedAt: nowIso,
    resolvedAt: null,
    assignee: draft.assignee,
    affectedAssets: [draft.asset],
    sourceIp: null,
    timeline: [{ at: nowIso, summary: 'Incidente registrado manualmente', actor: draft.reporter }],
  };
  sequence += 1;

  emit({
    ...state,
    incidents: [incident, ...state.incidents],
    recentIds: [...state.recentIds, incident.id],
    now: Math.max(state.now, now.getTime()),
  });
  highlight(incident.id);

  return incident;
}

/**
 * Cambia el estado de un incidente.
 *
 * Resolver fija la fecha de cierre y reabrir la borra: `resolvedAt` es lo que
 * leen las métricas, así que el estado y la fecha no pueden contradecirse.
 * `statusLabel` llega ya traducido porque la capa de datos no conoce el
 * catálogo de presentación.
 */
function setStatus(id: string, status: IncidentStatus, statusLabel: string, actor: string): void {
  replaceIncident(id, (incident, nowIso) => {
    if (incident.status === status) return incident;

    return {
      ...incident,
      status,
      resolvedAt: status === 'resolved' ? nowIso : null,
      timeline: appendEvent(incident, {
        at: nowIso,
        summary:
          incident.status === 'resolved'
            ? `Incidente reabierto en estado «${statusLabel}»`
            : `Estado cambiado a «${statusLabel}»`,
        actor,
      }),
    };
  });
}

function assign(id: string, assignee: string, actor: string): void {
  replaceIncident(id, (incident, nowIso) => {
    if (incident.assignee === assignee) return incident;

    return {
      ...incident,
      assignee,
      timeline: appendEvent(incident, {
        at: nowIso,
        summary: `Caso reasignado a ${assignee}`,
        actor,
      }),
    };
  });
}

/**
 * Devuelve un incidente a una versión anterior, tal cual era.
 *
 * Es lo que hay detrás de "Deshacer". Reponer la instantánea entera, y no
 * aplicar el cambio inverso, es lo que recupera la fecha de cierre original de
 * un caso reabierto por error: el cambio inverso lo cerraría "ahora".
 */
function restore(previous: Incident): void {
  replaceIncident(previous.id, () => previous);
}

/** Devuelve todo al dataset determinista con el que arrancó la sesión. */
function resetData(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  clearHighlights();
  sequence = NEXT_SEQUENCE;
  rng = null;
  emit(INITIAL_STATE);
}

export const incidentStore = {
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
  getSnapshot(): StoreState {
    return state;
  },

  toggleLive(): void {
    if (state.running) pauseLive();
    else startLive();
  },

  resetLive,
  createIncident: createManualIncident,
  setStatus,
  assign,
  restore,
  resetData,
} as const;

/** Milisegundos que el flujo lleva activo, sumando los tramos entre pausas. */
export function liveElapsedMs(live: LiveSession, at: number = Date.now()): number {
  return live.accumulatedMs + (live.since === null ? 0 : Math.max(0, at - live.since));
}
