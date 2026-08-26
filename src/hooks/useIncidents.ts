/**
 * Estado de la vista de incidentes: búsqueda, filtro por severidad, orden,
 * paginación y selección.
 *
 * El hook sólo coordina estado y memoiza; el filtrado y el orden viven en
 * `lib/filterIncidents.ts` como funciones puras.
 */

import { useCallback, useMemo, useState } from 'react';

import { createSearchIndex, filterIncidents, sortIncidents } from '@/lib/filterIncidents';
import type { Incident, Severity, SortableColumn, SortState } from '@/types';

/** Filas por página. Suficiente para llenar una pantalla sin volverla infinita. */
export const PAGE_SIZE = 25;

/** Lo más reciente primero: es lo que un analista quiere ver al abrir el tablero. */
const DEFAULT_SORT: SortState = { column: 'detectedAt', direction: 'desc' };

/** Columnas donde el primer clic debe ordenar de mayor a menor. */
const DESCENDING_FIRST: ReadonlySet<SortableColumn> = new Set<SortableColumn>([
  'detectedAt',
  'severity',
]);

export interface UseIncidentsResult {
  /** Incidentes de la página actual, ya filtrados y ordenados. */
  readonly incidents: readonly Incident[];
  /** Total tras aplicar los filtros, en todas las páginas. */
  readonly filteredCount: number;
  /** Total del dataset, sin filtrar. */
  readonly totalCount: number;

  readonly search: string;
  readonly severities: readonly Severity[];
  readonly hasActiveFilters: boolean;
  readonly setSearch: (value: string) => void;
  readonly toggleSeverity: (severity: Severity) => void;
  readonly clearFilters: () => void;

  readonly sort: SortState;
  readonly toggleSort: (column: SortableColumn) => void;

  readonly page: number;
  readonly pageCount: number;
  readonly goToPage: (page: number) => void;

  readonly selectedIncident: Incident | null;
  readonly selectIncident: (incident: Incident) => void;
  readonly closeIncident: () => void;
}

export function useIncidents(source: readonly Incident[]): UseIncidentsResult {
  const [search, setSearchValue] = useState('');
  const [severities, setSeverities] = useState<readonly Severity[]>([]);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // El índice de búsqueda depende sólo del dataset, no de lo que el usuario escriba.
  const searchIndex = useMemo(() => createSearchIndex(source), [source]);

  const filtered = useMemo(
    () => filterIncidents(source, { search, severities }, searchIndex),
    [source, search, severities, searchIndex],
  );

  const sorted = useMemo(() => sortIncidents(filtered, sort), [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Si los filtros redujeron el total, la página guardada puede haber quedado
  // fuera de rango. Se acota al renderizar en vez de con un efecto, para no
  // pintar nunca una página vacía.
  const currentPage = Math.min(page, pageCount);

  const incidents = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const toggleSeverity = useCallback((severity: Severity) => {
    setSeverities((current) =>
      current.includes(severity)
        ? current.filter((value) => value !== severity)
        : [...current, severity],
    );
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchValue('');
    setSeverities([]);
    setPage(1);
  }, []);

  /**
   * Un clic en una columna nueva la ordena en su dirección natural; un clic en
   * la columna activa invierte la dirección.
   */
  const toggleSort = useCallback((column: SortableColumn) => {
    setSort((current) => {
      if (current.column === column) {
        return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: DESCENDING_FIRST.has(column) ? 'desc' : 'asc' };
    });
    setPage(1);
  }, []);

  const goToPage = useCallback((next: number) => {
    setPage(Math.max(1, next));
  }, []);

  /**
   * Se guarda el id y no el objeto: si el dataset cambiara, el panel abierto
   * seguiría mostrando el incidente correcto en lugar de una copia obsoleta.
   */
  const selectedIncident = useMemo(
    () => (selectedId === null ? null : (source.find((item) => item.id === selectedId) ?? null)),
    [source, selectedId],
  );

  const selectIncident = useCallback((incident: Incident) => {
    setSelectedId(incident.id);
  }, []);

  const closeIncident = useCallback(() => {
    setSelectedId(null);
  }, []);

  return {
    incidents,
    filteredCount: sorted.length,
    totalCount: source.length,

    search,
    severities,
    hasActiveFilters: search.trim().length > 0 || severities.length > 0,
    setSearch,
    toggleSeverity,
    clearFilters,

    sort,
    toggleSort,

    page: currentPage,
    pageCount,
    goToPage,

    selectedIncident,
    selectIncident,
    closeIncident,
  };
}
