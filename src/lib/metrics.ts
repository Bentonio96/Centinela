/**
 * Cálculo de las métricas y de las series de los gráficos.
 *
 * Todo se deriva de la lista de incidentes: no hay cifras precalculadas ni
 * agregados guardados aparte que puedan quedar desincronizados.
 *
 * Decisión de producto: las métricas y los gráficos describen el panorama
 * completo de los últimos 30 días y **no** reaccionan a los filtros de la
 * tabla. Los filtros son una herramienta de triaje sobre el listado; si además
 * movieran los indicadores, sería imposible distinguir "bajaron los incidentes"
 * de "filtré la vista".
 */

import type {
  CategoryDatum,
  DashboardMetrics,
  Incident,
  IncidentCategory,
  MetricDelta,
  MetricSparklines,
  Severity,
  TrendPoint,
} from '@/types';
import { CATEGORY_META } from './catalog';
import { formatShortDate, hoursBetween, toLocalDateKey } from './format';

/** Ventana de observación del dashboard. */
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
function resolvedWithin(incidents: readonly Incident[], from: number, to: number): Incident[] {
  return incidents.filter((incident) => {
    if (incident.resolvedAt === null) return false;
    const resolved = Date.parse(incident.resolvedAt);
    return resolved >= from && resolved < to;
  });
}

function meanResolutionHours(incidents: readonly Incident[]): number {
  if (incidents.length === 0) return 0;

  const total = incidents.reduce((sum, incident) => {
    // `resolvedWithin` ya garantizó que hay fecha de cierre.
    return incident.resolvedAt === null
      ? sum
      : sum + hoursBetween(incident.detectedAt, incident.resolvedAt);
  }, 0);

  return total / incidents.length;
}

/** Variación en sus dos formas: porcentual cuando existe, y siempre absoluta. */
function buildDelta(current: number, previous: number): MetricDelta {
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

  const resolvedThisWeek = resolvedWithin(incidents, weekAgo, now);
  const resolvedPreviousWeek = resolvedWithin(incidents, twoWeeksAgo, weekAgo);

  const meanTimeToResolveHours = meanResolutionHours(resolvedWithin(incidents, windowStart, now));
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

/**
 * Serie diaria de los últimos `days` días.
 *
 * Los días sin incidentes se incluyen con cero: omitirlos comprimiría el eje y
 * haría ver una actividad continua donde hubo una pausa.
 */
export function buildTrendSeries(
  incidents: readonly Incident[],
  now: number = Date.now(),
  days: number = TREND_DAYS,
): TrendPoint[] {
  const buckets = new Map<string, { total: number; critical: number }>();
  const today = new Date(now);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today.getTime() - offset * DAY_MS);
    buckets.set(toLocalDateKey(date), { total: 0, critical: 0 });
  }

  for (const incident of incidents) {
    const key = toLocalDateKey(new Date(incident.detectedAt));
    const bucket = buckets.get(key);
    if (bucket === undefined) continue; // fuera de la ventana visible

    bucket.total += 1;
    if (incident.severity === 'critical') {
      bucket.critical += 1;
    }
  }

  return [...buckets.entries()].map(([date, counts]) => ({
    date,
    // `T12:00` evita que la conversión a hora local mueva la etiqueta un día.
    label: formatShortDate(`${date}T12:00:00`),
    total: counts.total,
    critical: counts.critical,
  }));
}

/**
 * Conteo por categoría en la ventana visible, de mayor a menor.
 * Se acompaña del subtotal de críticos para que la barra diga algo más que
 * volumen: 20 phishing de severidad baja no es lo mismo que 20 con críticos.
 */
export function buildCategorySeries(
  incidents: readonly Incident[],
  now: number = Date.now(),
  days: number = TREND_DAYS,
): CategoryDatum[] {
  const windowStart = now - days * DAY_MS;
  const counts = new Map<IncidentCategory, { total: number; critical: number }>();

  for (const incident of incidents) {
    if (Date.parse(incident.detectedAt) < windowStart) continue;

    const current = counts.get(incident.category) ?? { total: 0, critical: 0 };
    current.total += 1;
    if (incident.severity === 'critical') {
      current.critical += 1;
    }
    counts.set(incident.category, current);
  }

  return [...counts.entries()]
    .map(([category, value]) => {
      const meta = CATEGORY_META[category];
      return {
        category: meta.value,
        label: meta.label,
        shortLabel: meta.shortLabel,
        total: value.total,
        critical: value.critical,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/**
 * Serie diaria de cada métrica a lo largo de la ventana observada.
 *
 * Cada punto reconstruye la métrica *tal como habría sido* ese día, con la
 * misma definición que usa `computeMetrics`: los conteos son el estado al
 * cierre de la jornada y los dos indicadores de resolución son ventanas
 * móviles de siete días. Recalcular en vez de aproximar es lo que evita que el
 * sparkline y el número grande cuenten historias distintas.
 */
export function buildMetricSparklines(
  incidents: readonly Incident[],
  now: number = Date.now(),
  days: number = TREND_DAYS,
): MetricSparklines {
  const openIncidents: number[] = [];
  const criticalIncidents: number[] = [];
  const meanTimeToResolveHours: number[] = [];
  const resolvedThisWeek: number[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const at = now - offset * DAY_MS;
    const weekBefore = at - WEEK_MS;
    const resolved = resolvedWithin(incidents, weekBefore, at);

    openIncidents.push(countOpen(incidents, at));
    criticalIncidents.push(countOpen(incidents, at, 'critical'));
    meanTimeToResolveHours.push(meanResolutionHours(resolved));
    resolvedThisWeek.push(resolved.length);
  }

  return { openIncidents, criticalIncidents, meanTimeToResolveHours, resolvedThisWeek };
}
