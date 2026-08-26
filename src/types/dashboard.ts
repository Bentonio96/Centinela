/**
 * Tipos de la capa de presentación: filtros, orden y las formas de datos que
 * consumen las métricas y los gráficos. Separados de `incident.ts` porque
 * describen cómo se *mira* el dominio, no el dominio en sí.
 */

import type { IncidentCategory, Severity } from './incident';

/** Columnas por las que se puede ordenar la tabla. */
export const SORTABLE_COLUMNS = ['id', 'title', 'severity', 'status', 'category', 'detectedAt'] as const;
export type SortableColumn = (typeof SORTABLE_COLUMNS)[number];

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  readonly column: SortableColumn;
  readonly direction: SortDirection;
}

/**
 * Estado de filtrado de la tabla.
 * `severities` vacío significa "sin filtro", no "ninguna severidad".
 */
export interface IncidentFilters {
  readonly search: string;
  readonly severities: readonly Severity[];
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

/** Las cuatro métricas de la fila superior. */
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

/** Un punto del gráfico de línea: un día del período observado. */
export interface TrendPoint {
  /** Fecha `YYYY-MM-DD`, usada como clave y para el eje X. */
  readonly date: string;
  /** Etiqueta corta ya formateada para el eje: "14 ago". */
  readonly label: string;
  readonly total: number;
  readonly critical: number;
}

/** Una barra del gráfico de categorías. */
export interface CategoryDatum {
  readonly category: IncidentCategory;
  /** Etiqueta completa, para el tooltip: "Denegación de servicio". */
  readonly label: string;
  /** Versión corta para el eje, donde el espacio manda: "DDoS". */
  readonly shortLabel: string;
  readonly total: number;
  readonly critical: number;
}
