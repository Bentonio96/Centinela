/**
 * Series de la vista de analítica.
 *
 * A diferencia del panel, aquí la ventana la elige quien mira: 7, 14 o 30
 * días. Cada cifra se acompaña del mismo cálculo sobre la ventana
 * inmediatamente anterior, y por eso el máximo es 30: el dataset cubre 60 días
 * y una ventana mayor no tendría contra qué compararse sin inventarlo.
 */

import { TEAM, type Analyst } from '@/data/team';
import type { Incident, IncidentCategory, MetricDelta, Severity } from '@/types';
import { CATEGORIES, SEVERITIES } from '@/types';
import { buildDelta, meanResolutionHours, resolvedWithin } from './metrics';
import { startOfLocalDay, toLocalDateKey } from './format';
import { slaStatus } from './sla';

export const RANGES = [7, 14, 30] as const;
export type RangeDays = (typeof RANGES)[number];

const DAY_MS = 86_400_000;

/**
 * La ventana observada, alineada a la medianoche local.
 *
 * Termina al final del día de hoy y no en `now`: así cada punto de las series
 * es un día completo del calendario, que es como se leen las etiquetas del
 * eje. Todas las cifras de la vista salen de esta misma ventana; si cada una
 * definiera la suya, "123 detectados" y un anillo que suma 124 convivirían en
 * la misma pantalla.
 */
function rangeWindow(now: number, days: number): { readonly from: number; readonly to: number } {
  const to = startOfLocalDay(now).getTime() + DAY_MS;
  return { from: to - days * DAY_MS, to };
}

/** Incidentes detectados dentro de `[from, to)`. */
function detectedWithin(incidents: readonly Incident[], from: number, to: number): Incident[] {
  return incidents.filter((incident) => {
    const detected = Date.parse(incident.detectedAt);
    return detected >= from && detected < to;
  });
}

/** Incidentes detectados en la ventana observada. */
function detectedInRange(incidents: readonly Incident[], now: number, days: number): Incident[] {
  const { from, to } = rangeWindow(now, days);
  return detectedWithin(incidents, from, to);
}

/** Fracción cerrada dentro de plazo, sobre los casos con plazo ya decidido. */
function slaCompliance(incidents: readonly Incident[], now: number): number {
  let met = 0;
  let decided = 0;
  for (const incident of incidents) {
    const { state } = slaStatus(incident, now);
    if (state === 'met') {
      met += 1;
      decided += 1;
    } else if (state === 'breached') {
      decided += 1;
    }
  }
  return decided === 0 ? 0 : met / decided;
}

export interface Kpi {
  readonly value: number;
  readonly delta: MetricDelta;
  /** Un punto por día de la ventana, del más antiguo al más reciente. */
  readonly series: readonly number[];
}

export interface AnalyticsKpis {
  readonly detected: Kpi;
  readonly resolved: Kpi;
  /** Horas. */
  readonly meanTimeToResolve: Kpi;
  /** Fracción de 0 a 1. */
  readonly slaCompliance: Kpi;
}

/** Límites de cada día de la ventana, del más antiguo al más reciente. */
function dayBounds(now: number, days: number): { readonly from: number; readonly to: number }[] {
  const { from } = rangeWindow(now, days);
  return Array.from({ length: days }, (_, index) => ({
    from: from + index * DAY_MS,
    to: from + (index + 1) * DAY_MS,
  }));
}

export function buildKpis(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): AnalyticsKpis {
  const bounds = dayBounds(now, days);
  const { from: start, to: end } = rangeWindow(now, days);
  const previousStart = start - days * DAY_MS;

  const detected = detectedWithin(incidents, start, end);
  const previousDetected = detectedWithin(incidents, previousStart, start);
  const resolved = resolvedWithin(incidents, start, end);
  const previousResolved = resolvedWithin(incidents, previousStart, start);

  const compliance = slaCompliance(detected, now);
  // La ventana anterior se evalúa en su propio final: mirarla desde hoy le
  // regalaría el tiempo extra que tuvo para cerrar casos.
  const previousCompliance = slaCompliance(previousDetected, start);

  // Ventana móvil de siete días para las dos métricas de resolución: un día
  // sin cierres no tiene media, y graficarlo como cero sería mentir.
  const rolling = bounds.map(({ to }) => resolvedWithin(incidents, to - 7 * DAY_MS, to));

  return {
    detected: {
      value: detected.length,
      delta: buildDelta(detected.length, previousDetected.length),
      series: bounds.map(({ from, to }) => detectedWithin(incidents, from, to).length),
    },
    resolved: {
      value: resolved.length,
      delta: buildDelta(resolved.length, previousResolved.length),
      series: bounds.map(({ from, to }) => resolvedWithin(incidents, from, to).length),
    },
    meanTimeToResolve: {
      value: meanResolutionHours(resolved),
      delta: buildDelta(meanResolutionHours(resolved), meanResolutionHours(previousResolved)),
      series: rolling.map((window) => meanResolutionHours(window)),
    },
    slaCompliance: {
      value: compliance,
      delta: {
        // En puntos porcentuales: "el cumplimiento subió 4 puntos" se entiende;
        // "subió un 5 % sobre un 80 %" obliga a hacer la cuenta.
        percent: null,
        absolute: (compliance - previousCompliance) * 100,
      },
      series: rolling.map((window) => slaCompliance(window, now)),
    },
  };
}

export interface ThroughputPoint {
  /** Día `YYYY-MM-DD` de la ventana actual. */
  readonly date: string;
  readonly current: number;
  /** El mismo día relativo de la ventana anterior. */
  readonly previous: number;
}

/** Detecciones por día, con la ventana anterior superpuesta día a día. */
export function buildThroughput(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): ThroughputPoint[] {
  return dayBounds(now, days).map(({ from, to }) => ({
    date: toLocalDateKey(new Date(from)),
    current: detectedWithin(incidents, from, to).length,
    previous: detectedWithin(incidents, from - days * DAY_MS, to - days * DAY_MS).length,
  }));
}

export interface CategoryShare {
  readonly category: IncidentCategory;
  readonly total: number;
  /** Fracción del total de la ventana. */
  readonly share: number;
}

/** Reparto por categoría en la ventana, de mayor a menor. */
export function buildCategoryShare(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): CategoryShare[] {
  const windowed = detectedInRange(incidents, now, days);
  const total = Math.max(1, windowed.length);

  return CATEGORIES.map((category) => {
    const count = windowed.filter((incident) => incident.category === category).length;
    return { category, total: count, share: count / total };
  })
    .filter((entry) => entry.total > 0)
    .sort((a, b) => b.total - a.total);
}

export interface SeverityShare {
  readonly severity: Severity;
  readonly total: number;
  readonly share: number;
}

export function buildSeverityShare(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): SeverityShare[] {
  const windowed = detectedInRange(incidents, now, days);
  const total = Math.max(1, windowed.length);

  return SEVERITIES.map((severity) => {
    const count = windowed.filter((incident) => incident.severity === severity).length;
    return { severity, total: count, share: count / total };
  });
}

export interface Heatmap {
  /** `cells[día][hora]`, con el día 0 = lunes. */
  readonly cells: readonly (readonly number[])[];
  readonly max: number;
  /** La celda más cargada, para resumirla en texto. */
  readonly peak: { readonly weekday: number; readonly hour: number } | null;
}

/**
 * Cuándo llegan los incidentes: día de la semana contra hora del día.
 *
 * Responde una pregunta de dotación, no de seguridad: en qué franjas hace
 * falta más gente mirando. Siempre con lunes arriba; el ajuste de "la semana
 * empieza en" lo reordena quien lo pinta.
 */
export function buildHeatmap(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): Heatmap {
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 0;
  let peak: Heatmap['peak'] = null;

  for (const incident of detectedInRange(incidents, now, days)) {
    const date = new Date(incident.detectedAt);
    // `getDay()` devuelve 0 para el domingo; se rota para que el lunes sea 0.
    const weekday = (date.getDay() + 6) % 7;
    const hour = date.getHours();
    const row = cells[weekday];
    if (row === undefined) continue;

    const value = (row[hour] ?? 0) + 1;
    row[hour] = value;
    if (value > max) {
      max = value;
      peak = { weekday, hour };
    }
  }

  return { cells, max, peak };
}

export interface AnalystRanking {
  readonly analyst: Analyst;
  readonly resolved: number;
  /** Horas, o `null` si no cerró nada en la ventana. */
  readonly meanHours: number | null;
}

/** Quién cerró más casos en la ventana, con su tiempo medio. */
export function buildAnalystRanking(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): AnalystRanking[] {
  const { from, to } = rangeWindow(now, days);
  const resolved = resolvedWithin(incidents, from, to);

  return TEAM.map((analyst) => {
    const mine = resolved.filter((incident) => incident.assignee === analyst.name);
    return {
      analyst,
      resolved: mine.length,
      meanHours: mine.length === 0 ? null : meanResolutionHours(mine),
    };
  }).sort((a, b) => b.resolved - a.resolved);
}

/** Los incidentes detectados en la ventana, para exportarlos. */
export function incidentsInRange(
  incidents: readonly Incident[],
  now: number,
  days: RangeDays,
): Incident[] {
  return detectedInRange(incidents, now, days);
}
