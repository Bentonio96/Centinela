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
 *
 * Una lista vacía significa "sin filtro", no "ninguna": es la distinción que
 * permite que el estado por defecto no tenga que enumerar todos los valores.
 */
export interface IncidentFilters {
  readonly search: string;
  readonly severities: readonly Severity[];
  /**
   * Emitida al hacer clic en una barra del gráfico o elegida en el selector.
   *
   * Es de selección única, a diferencia de la severidad: filtrar por "crítica
   * y alta" a la vez es triaje corriente, filtrar por "malware y DDoS" a la vez
   * casi nunca lo es. Mantenerla única deja que el gráfico y el selector
   * muestren siempre lo mismo, sin estados intermedios que reconciliar.
   */
  readonly category: IncidentCategory | null;
  /** Día concreto `YYYY-MM-DD`, emitido al hacer clic en el gráfico de línea. */
  readonly day: string | null;
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
