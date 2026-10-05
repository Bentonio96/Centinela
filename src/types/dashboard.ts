/**
 * Tipos de la capa de presentación: filtros, orden y las formas de datos que
 * consumen las métricas. Separados de `incident.ts` porque describen cómo se
 * *mira* el dominio, no el dominio en sí.
 */

import type { IncidentCategory, IncidentStatus, Severity } from './incident';

/** Columnas por las que se puede ordenar la tabla. */
export const SORTABLE_COLUMNS = [
  'id',
  'title',
  'severity',
  'status',
  'category',
  'detectedAt',
] as const;
export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly column: SortableColumn;
  readonly direction: SortDirection;
}

/**
 * Estado de filtrado de la tabla.
 *
 * Una lista vacía significa "sin filtro", no "ninguna": es la distinción que
 * permite que el estado por defecto no tenga que enumerar todos los valores.
 */
export interface IncidentFilters {
  readonly search: string;
  readonly severities: readonly Severity[];
  /**
   * Es de selección única, a diferencia de la severidad: filtrar por "crítica
   * y alta" a la vez es triaje corriente, filtrar por "malware y DDoS" a la vez
   * casi nunca lo es.
   */
  readonly category: IncidentCategory | null;
  /** Día concreto `YYYY-MM-DD`, emitido desde el panel o el calendario. */
  readonly day: string | null;
  /**
   * Estados del ciclo de vida. Es de selección múltiple porque el caso que
   * importa —"sin resolver"— son tres estados a la vez, no uno.
   */
  readonly statuses: readonly IncidentStatus[];
  /**
   * Analista responsable, emitido desde la vista de equipo o el atajo
   * "Mis casos". Es un nombre del catálogo de analistas, no texto libre.
   */
  readonly assignee: string | null;
}

/**
 * Variación de una métrica contra su período de referencia.
 *
 * Lleva las dos formas porque ninguna sirve sola: el porcentaje es lo legible
 * cuando hay volumen, pero con una base de cero no existe, y con dos o tres
 * casos amplifica el ruido hasta lo absurdo. La diferencia absoluta cubre
 * justamente esos casos.
 */
export interface MetricDelta {
  /** Variación porcentual, o `null` si el período anterior fue cero. */
  readonly percent: number | null;
  /** Diferencia sin escalar. En el tiempo de resolución son horas. */
  readonly absolute: number;
}

/** Las cuatro métricas de la fila superior del panel. */
export interface DashboardMetrics {
  readonly openIncidents: number;
  readonly criticalIncidents: number;
  /** Tiempo medio de resolución en horas, sobre incidentes ya resueltos. */
  readonly meanTimeToResolveHours: number;
  readonly resolvedThisWeek: number;
  /** Variación de cada métrica contra su período anterior equivalente. */
  readonly deltas: {
    readonly openIncidents: MetricDelta;
    readonly criticalIncidents: MetricDelta;
    readonly meanTimeToResolveHours: MetricDelta;
    readonly resolvedThisWeek: MetricDelta;
  };
}
