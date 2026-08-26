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

/** Las cuatro métricas de la fila superior. */
export interface DashboardMetrics {
  readonly openIncidents: number;
  readonly criticalIncidents: number;
  /** Tiempo medio de resolución en horas, sobre incidentes ya resueltos. */
  readonly meanTimeToResolveHours: number;
  readonly resolvedThisWeek: number;
  /**
   * Variación porcentual contra el período anterior equivalente.
   * `null` cuando no hay base de comparación (período anterior sin datos).
   */
  readonly deltas: {
    readonly openIncidents: number | null;
    readonly criticalIncidents: number | null;
    readonly meanTimeToResolveHours: number | null;
    readonly resolvedThisWeek: number | null;
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
  /** Etiqueta en español lista para el eje. */
  readonly label: string;
  readonly total: number;
  readonly critical: number;
}
