/**
 * Cálculo de las métricas y de las series del panel.
 *
 * Todo se deriva de la lista de incidentes: no hay cifras precalculadas ni
 * agregados guardados aparte que puedan quedar desincronizados.
 *
 * Decisión de producto: las métricas describen el panorama completo y **no**
 * reaccionan a los filtros de la tabla. Los filtros son una herramienta de
 * triaje sobre el listado; si además movieran los indicadores, sería imposible
 * distinguir "bajaron los incidentes" de "filtré la vista".
 */

import { TEAM, isOnShift, type Analyst } from '@/data/team';
import type { DashboardMetrics, Incident, MetricDelta, Severity } from '@/types';
import { hoursBetween, startOfLocalDay, toLocalDateKey } from './format';
import { slaStatus } from './sla';

/** Ventana de observación del panel. */
export const TREND_DAYS = 30;

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Si el incidente estaba sin resolver en el instante dado.
 * Reconstruir el estado pasado es lo que permite comparar contra la semana
 * anterior sin guardar instantáneas históricas.
 */
function wasOpenAt(incident: Incident, timestamp: number): boolean {
  if (Date.parse(incident.detectedAt) > timestamp) return false;
  if (incident.resolvedAt === null) return true;
  return Date.parse(incident.resolvedAt) > timestamp;
}

/** Incidentes cerrados dentro de la ventana `[from, to)`. */
export function resolvedWithin(
  incidents: readonly Incident[],
  from: number,
  to: number,
): Incident[] {
  return incidents.filter((incident) => {
    if (incident.resolvedAt === null) return false;
    const resolved = Date.parse(incident.resolvedAt);
    return resolved >= from && resolved < to;
  });
}

export function meanResolutionHours(incidents: readonly Incident[]): number {
  if (incidents.length === 0) return 0;

  const total = incidents.reduce((sum, incident) => {
    return incident.resolvedAt === null
      ? sum
      : sum + hoursBetween(incident.detectedAt, incident.resolvedAt);
  }, 0);

  return total / incidents.length;
}

/** Variación en sus dos formas: porcentual cuando existe, y siempre absoluta. */
export function buildDelta(current: number, previous: number): MetricDelta {
  return {
    percent: previous === 0 ? null : ((current - previous) / previous) * 100,
    absolute: current - previous,
  };
}

function countOpen(incidents: readonly Incident[], at: number, severity?: Severity): number {
  return incidents.filter((incident) => {
    if (severity !== undefined && incident.severity !== severity) return false;
    return wasOpenAt(incident, at);
  }).length;
}

/**
 * Las cuatro métricas de cabecera.
 *
 * Cada una se compara contra su propia línea base: los conteos de abiertos
 * contra el estado de hace una semana, los cierres contra la semana previa, y
 * el tiempo de resolución contra los 30 días anteriores, que es una muestra lo
 * bastante grande para no oscilar con dos o tres casos sueltos.
 */
export function computeMetrics(
  incidents: readonly Incident[],
  now: number = Date.now(),
): DashboardMetrics {
  const weekAgo = now - WEEK_MS;
  const twoWeeksAgo = now - 2 * WEEK_MS;
  const windowStart = now - TREND_DAYS * DAY_MS;
  const previousWindowStart = now - 2 * TREND_DAYS * DAY_MS;

  const openIncidents = countOpen(incidents, now);
  const openWeekAgo = countOpen(incidents, weekAgo);

  const criticalIncidents = countOpen(incidents, now, 'critical');
  const criticalWeekAgo = countOpen(incidents, weekAgo, 'critical');

  // El límite superior es `now + 1`: un incidente cerrado en este mismo
  // instante —alguien acaba de pulsar "Resolver"— tiene que contar ya.
  const resolvedThisWeek = resolvedWithin(incidents, weekAgo, now + 1);
  const resolvedPreviousWeek = resolvedWithin(incidents, twoWeeksAgo, weekAgo);

  const meanTimeToResolveHours = meanResolutionHours(
    resolvedWithin(incidents, windowStart, now + 1),
  );
  const previousMeanTimeToResolve = meanResolutionHours(
    resolvedWithin(incidents, previousWindowStart, windowStart),
  );

  return {
    openIncidents,
    criticalIncidents,
    meanTimeToResolveHours,
    resolvedThisWeek: resolvedThisWeek.length,
    deltas: {
      openIncidents: buildDelta(openIncidents, openWeekAgo),
      criticalIncidents: buildDelta(criticalIncidents, criticalWeekAgo),
      meanTimeToResolveHours: buildDelta(meanTimeToResolveHours, previousMeanTimeToResolve),
      resolvedThisWeek: buildDelta(resolvedThisWeek.length, resolvedPreviousWeek.length),
    },
  };
}

/** Conteo de detecciones por día local. */
export function countByDay(incidents: readonly Incident[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const incident of incidents) {
    const key = toLocalDateKey(new Date(incident.detectedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export interface LoadDay {
  /** Día `YYYY-MM-DD` en hora local. */
  readonly date: string;
  readonly value: number;
  /**
   * Si la cifra es una proyección y no un conteo.
   *
   * Los días que aún no ocurren no tienen dato; lo que se dibuja ahí es la
   * media de ese mismo día de la semana en las cuatro semanas previas. Es una
   * expectativa de carga para planificar la guardia, y se pinta rayada para que
   * nadie la lea como un hecho.
   */
  readonly projected: boolean;
  readonly isToday: boolean;
}

/** Días ya ocurridos que muestra la carga, contando hoy. */
const LOAD_PAST_DAYS = 4;
/** Días proyectados hacia adelante. */
const LOAD_FUTURE_DAYS = 3;
/** Semanas previas que promedia la proyección. */
const PROJECTION_WEEKS = 4;

/**
 * Carga de la semana: los últimos días reales y la proyección de los próximos.
 *
 * Es una ventana móvil centrada en hoy, y no la semana natural, porque un
 * lunes la semana natural sería un dato y seis proyecciones.
 */
export function buildLoadSeries(incidents: readonly Incident[], now: number): LoadDay[] {
  const counts = countByDay(incidents);
  const today = startOfLocalDay(now);
  const days: LoadDay[] = [];

  for (let offset = -(LOAD_PAST_DAYS - 1); offset <= LOAD_FUTURE_DAYS; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    const key = toLocalDateKey(date);

    if (offset <= 0) {
      days.push({
        date: key,
        value: counts.get(key) ?? 0,
        projected: false,
        isToday: offset === 0,
      });
      continue;
    }

    // Mismo día de la semana, una a cuatro semanas atrás. Se retrocede hasta
    // caer en el pasado: el día proyectado puede estar a varios días de hoy.
    let sum = 0;
    for (let week = 1; week <= PROJECTION_WEEKS; week += 1) {
      const past = new Date(date);
      past.setDate(date.getDate() - week * 7);
      sum += counts.get(toLocalDateKey(past)) ?? 0;
    }

    days.push({
      date: key,
      value: Math.round(sum / PROJECTION_WEEKS),
      projected: true,
      isToday: false,
    });
  }

  return days;
}

/**
 * Ordena casos sin resolver por urgencia: primero el plazo que vence antes.
 *
 * Es la política de "plazo más próximo primero". La severidad no hace falta
 * como criterio aparte porque ya está dentro del plazo —un crítico tiene doce
 * horas y un caso de severidad baja, una semana—, así que quien vence antes
 * es, casi siempre, también el más grave.
 *
 * Lo ya vencido va después, y lo vencido hace menos, antes. Un caso que lleva
 * un mes fuera de plazo no se arregla en este turno; el que vence en dos horas
 * todavía se puede salvar, y ése es el que hay que mirar ahora. Es la única
 * definición de urgencia de la aplicación: la usan la cola del panel, el
 * tablero, los avisos y el traspaso, para que no se contradigan.
 */
export function sortByUrgency(incidents: readonly Incident[], now: number): Incident[] {
  return incidents
    .map((incident) => {
      const { targetHours, elapsedHours } = slaStatus(incident, now);
      return { incident, remaining: targetHours - elapsedHours };
    })
    .sort((a, b) => {
      const aOverdue = a.remaining < 0;
      const bOverdue = b.remaining < 0;
      if (aOverdue !== bOverdue) return aOverdue ? 1 : -1;
      // Entre vigentes, menos tiempo restante primero; entre vencidos, el
      // menos pasado primero. Las dos cosas son "más cerca del plazo".
      return aOverdue ? b.remaining - a.remaining : a.remaining - b.remaining;
    })
    .map((entry) => entry.incident);
}

/** Los casos sin resolver que conviene mirar primero. */
export function buildPriorityQueue(
  incidents: readonly Incident[],
  now: number,
  limit: number,
): Incident[] {
  return sortByUrgency(
    incidents.filter((incident) => incident.resolvedAt === null),
    now,
  ).slice(0, limit);
}

export interface AnalystWorkload {
  readonly analyst: Analyst;
  /** Casos sin resolver a su nombre. */
  readonly open: number;
  /** Cerrados en la ventana observada. */
  readonly resolved: number;
  /** El caso abierto más urgente, o `null` si no tiene ninguno. */
  readonly focus: Incident | null;
  readonly onShift: boolean;
  /** Carga relativa a quien más casos abiertos tiene: 0 a 1. */
  readonly load: number;
}

/** Carga de cada analista del equipo, en el orden del catálogo. */
export function buildWorkloads(
  incidents: readonly Incident[],
  now: number,
  days: number = TREND_DAYS,
): AnalystWorkload[] {
  const windowStart = now - days * DAY_MS;
  const at = new Date(now);

  const base = TEAM.map((analyst) => {
    const mine = incidents.filter((incident) => incident.assignee === analyst.name);
    const unresolved = mine.filter((incident) => incident.resolvedAt === null);

    return {
      analyst,
      open: unresolved.length,
      resolved: resolvedWithin(mine, windowStart, now + 1).length,
      focus: buildPriorityQueue(unresolved, now, 1)[0] ?? null,
      onShift: isOnShift(analyst, at),
    };
  });

  const maxOpen = Math.max(1, ...base.map((entry) => entry.open));
  return base.map((entry) => ({ ...entry, load: entry.open / maxOpen }));
}
