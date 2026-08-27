/**
 * Estado de la vista de incidentes: búsqueda, filtros, orden, paginación y
 * selección.
 *
 * La fuente de verdad es la URL, no `useState`. El hook mantiene una copia en
 * memoria para renderizar, pero cada cambio se refleja en la barra de
 * direcciones, y `popstate` la vuelve a leer. Eso da tres cosas gratis:
 * enlaces que se pueden compartir, recargas que no pierden el contexto y un
 * botón "atrás" que hace lo que el usuario espera.
 *
 * El filtrado y el orden siguen viviendo en `lib/filterIncidents` como
 * funciones puras; aquí sólo se coordina estado.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createSearchIndex, filterIncidents, sortIncidents } from '@/lib/filterIncidents';
import { parseViewState, toUrl, type ViewState } from '@/lib/urlState';
import type {
  Incident,
  IncidentCategory,
  IncidentStatus,
  Severity,
  SortableColumn,
} from '@/types';

/** Filas por página. Suficiente para llenar una pantalla sin volverla infinita. */
export const PAGE_SIZE = 25;

/** Columnas donde el primer clic debe ordenar de mayor a menor. */
const DESCENDING_FIRST: ReadonlySet<SortableColumn> = new Set<SortableColumn>([
  'detectedAt',
  'severity',
]);

/**
 * Cómo se escribe el cambio en el historial.
 *
 * Casi todo va con `replace`: teclear en la búsqueda no debe dejar una entrada
 * por letra. Abrir el panel de detalle es la excepción y va con `push`, para
 * que cerrarlo con el botón "atrás" del navegador funcione igual que con el
 * botón de cerrar.
 */
type HistoryMode = 'replace' | 'push';

interface Navigation {
  readonly view: ViewState;
  readonly mode: HistoryMode;
}

/** Marca las entradas de historial que creó el panel, para saber si hay a dónde volver. */
const PANEL_ENTRY = { centinelaPanel: true };

function isPanelEntry(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'centinelaPanel' in state &&
    state.centinelaPanel === true
  );
}

function currentUrl(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * Un conjunto de filtros completo, tal como lo emite una tarjeta de indicador.
 *
 * Se aplica reemplazando —no combinando— todo lo que hubiera antes: pulsar
 * "Críticos sin resolver" tiene que llevar exactamente a esos, no a esos
 * intersecados con lo que quedara de una búsqueda anterior. Lo que se omite
 * queda limpio.
 */
export interface FilterPreset {
  readonly search?: string;
  readonly severities?: readonly Severity[];
  readonly statuses?: readonly IncidentStatus[];
  readonly category?: IncidentCategory | null;
  readonly day?: string | null;
}

/** Igualdad sin importar el orden: son conjuntos, no secuencias. */
function sameValues<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

export interface UseIncidentsResult {
  /** Incidentes de la página actual, ya filtrados y ordenados. */
  readonly incidents: readonly Incident[];
  /** Total tras aplicar los filtros, en todas las páginas. */
  readonly filteredCount: number;
  /** Total del dataset, sin filtrar. */
  readonly totalCount: number;

  readonly search: string;
  readonly severities: readonly Severity[];
  readonly statuses: readonly IncidentStatus[];
  readonly category: IncidentCategory | null;
  readonly day: string | null;
  readonly hasActiveFilters: boolean;
  readonly setSearch: (value: string) => void;
  readonly toggleSeverity: (severity: Severity) => void;
  /**
   * Reemplazan el filtro; `null` lo limpia.
   *
   * Son asignaciones y no conmutadores: el "volver a pulsar para quitar" es un
   * gesto que sólo tiene sentido sobre un gráfico, así que vive en el gráfico.
   * Aquí dejaría al `<select>` teniendo que simular una asignación con dos
   * llamadas encadenadas.
   */
  readonly selectCategory: (category: IncidentCategory | null) => void;
  readonly selectDay: (day: string | null) => void;
  readonly clearStatuses: () => void;
  /** Reemplaza todos los filtros por los del conjunto dado. */
  readonly applyPreset: (preset: FilterPreset) => void;
  /** Si la vista actual es exactamente la que produce ese conjunto. */
  readonly isPresetActive: (preset: FilterPreset) => boolean;
  readonly clearFilters: () => void;

  readonly sort: ViewState['sort'];
  readonly toggleSort: (column: SortableColumn) => void;

  readonly page: number;
  readonly pageCount: number;
  readonly goToPage: (page: number) => void;

  readonly selectedIncident: Incident | null;
  readonly selectIncident: (incident: Incident) => void;
  /** Salta al incidente anterior o siguiente de la página, sin cerrar el panel. */
  readonly selectAdjacentIncident: (offset: 1 | -1) => void;
  /** Si hay a dónde saltar en esa dirección, para desactivar el control. */
  readonly hasAdjacentIncident: (offset: 1 | -1) => boolean;
  readonly closeIncident: () => void;
}

export function useIncidents(source: readonly Incident[]): UseIncidentsResult {
  const [navigation, setNavigation] = useState<Navigation>(() => ({
    view: parseViewState(window.location.search),
    mode: 'replace',
  }));
  const view = navigation.view;

  /**
   * Sincroniza la barra de direcciones con el estado.
   *
   * El efecto compara antes de escribir. Eso lo vuelve idempotente, que es lo
   * que permite que el doble montaje de StrictMode no duplique entradas del
   * historial, y que la vuelta desde `popstate` no reescriba la URL que acaba
   * de restaurar el navegador.
   */
  useEffect(() => {
    const url = toUrl(view);
    if (url === currentUrl()) return;

    if (navigation.mode === 'push') {
      window.history.pushState(PANEL_ENTRY, '', url);
    } else {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [view, navigation.mode]);

  // El usuario navegó con los botones del navegador: la URL manda.
  useEffect(() => {
    const handlePopState = () => {
      setNavigation({ view: parseViewState(window.location.search), mode: 'replace' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback(
    (update: (current: ViewState) => ViewState, mode: HistoryMode = 'replace') => {
      setNavigation((current) => ({ view: update(current.view), mode }));
    },
    [],
  );

  /** Cualquier cambio de filtro devuelve el listado a la primera página. */
  const filter = useCallback(
    (update: (current: ViewState) => ViewState) => {
      navigate((current) => ({ ...update(current), page: 1 }));
    },
    [navigate],
  );

  // El índice de búsqueda depende sólo del dataset, no de lo que el usuario escriba.
  const searchIndex = useMemo(() => createSearchIndex(source), [source]);

  const filtered = useMemo(
    () =>
      filterIncidents(
        source,
        {
          search: view.search,
          severities: view.severities,
          category: view.category,
          day: view.day,
          statuses: view.statuses,
        },
        searchIndex,
      ),
    [source, view.search, view.severities, view.statuses, view.category, view.day, searchIndex],
  );

  const sorted = useMemo(() => sortIncidents(filtered, view.sort), [filtered, view.sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  // Si los filtros redujeron el total, la página de la URL puede haber quedado
  // fuera de rango. Se acota al renderizar en vez de con un efecto, para no
  // pintar nunca una página vacía.
  const currentPage = Math.min(view.page, pageCount);

  const incidents = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage],
  );

  const setSearch = useCallback(
    (value: string) => {
      filter((current) => ({ ...current, search: value }));
    },
    [filter],
  );

  const toggleSeverity = useCallback(
    (severity: Severity) => {
      filter((current) => ({
        ...current,
        severities: current.severities.includes(severity)
          ? current.severities.filter((value) => value !== severity)
          : [...current.severities, severity],
      }));
    },
    [filter],
  );

  const selectCategory = useCallback(
    (category: IncidentCategory | null) => {
      filter((current) => ({ ...current, category }));
    },
    [filter],
  );

  const selectDay = useCallback(
    (day: string | null) => {
      filter((current) => ({ ...current, day }));
    },
    [filter],
  );

  const clearStatuses = useCallback(() => {
    filter((current) => ({ ...current, statuses: [] }));
  }, [filter]);

  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      filter((current) => ({
        ...current,
        search: preset.search ?? '',
        severities: preset.severities ?? [],
        statuses: preset.statuses ?? [],
        category: preset.category ?? null,
        day: preset.day ?? null,
      }));
    },
    [filter],
  );

  const isPresetActive = useCallback(
    (preset: FilterPreset) =>
      view.search === (preset.search ?? '') &&
      view.category === (preset.category ?? null) &&
      view.day === (preset.day ?? null) &&
      sameValues(view.severities, preset.severities ?? []) &&
      sameValues(view.statuses, preset.statuses ?? []),
    [view],
  );

  const clearFilters = useCallback(() => {
    filter((current) => ({
      ...current,
      search: '',
      severities: [],
      statuses: [],
      category: null,
      day: null,
    }));
  }, [filter]);

  /**
   * Un clic en una columna nueva la ordena en su dirección natural; un clic en
   * la columna activa invierte la dirección.
   */
  const toggleSort = useCallback(
    (column: SortableColumn) => {
      filter((current) => ({
        ...current,
        sort:
          current.sort.column === column
            ? { column, direction: current.sort.direction === 'asc' ? 'desc' : 'asc' }
            : { column, direction: DESCENDING_FIRST.has(column) ? 'desc' : 'asc' },
      }));
    },
    [filter],
  );

  const goToPage = useCallback(
    (next: number) => {
      navigate((current) => ({ ...current, page: Math.max(1, next) }));
    },
    [navigate],
  );

  /**
   * Se guarda el id y no el objeto: si el dataset cambia —y con el modo en vivo
   * cambia— el panel abierto sigue mostrando el incidente correcto en lugar de
   * una copia congelada.
   */
  const selectedIncident = useMemo(
    () =>
      view.selectedId === null
        ? null
        : (source.find((item) => item.id === view.selectedId) ?? null),
    [source, view.selectedId],
  );

  const selectIncident = useCallback(
    (incident: Incident) => {
      navigate((current) => ({ ...current, selectedId: incident.id }), 'push');
    },
    [navigate],
  );

  /**
   * Índice del incidente abierto dentro de la página visible.
   *
   * La navegación se queda dentro de la página a propósito: saltar de la
   * última fila de una página a la primera de la siguiente cambiaría el listado
   * bajo los pies de quien sólo quería ver el incidente de al lado.
   */
  const selectedIndex = useMemo(
    () => incidents.findIndex((incident) => incident.id === view.selectedId),
    [incidents, view.selectedId],
  );

  const hasAdjacentIncident = useCallback(
    (offset: 1 | -1) => {
      if (selectedIndex < 0) return false;
      const next = selectedIndex + offset;
      return next >= 0 && next < incidents.length;
    },
    [incidents.length, selectedIndex],
  );

  const selectAdjacentIncident = useCallback(
    (offset: 1 | -1) => {
      const next = incidents[selectedIndex + offset];
      if (selectedIndex < 0 || next === undefined) return;

      // `replace` y no `push`: recorrer diez incidentes no debe dejar diez
      // entradas que haya que deshacer una por una para cerrar el panel.
      navigate((current) => ({ ...current, selectedId: next.id }));
    },
    [incidents, navigate, selectedIndex],
  );

  const closeIncident = useCallback(() => {
    // Si el panel se abrió empujando una entrada, cerrarlo es volver atrás: así
    // el botón de cerrar y el gesto del navegador terminan en el mismo sitio.
    // Si en cambio se llegó directo con `?inc=…`, no hay a dónde volver y se
    // reemplaza la entrada actual para no sacar al usuario del sitio.
    if (isPanelEntry(window.history.state)) {
      window.history.back();
    } else {
      navigate((current) => ({ ...current, selectedId: null }));
    }
  }, [navigate]);

  return {
    incidents,
    filteredCount: sorted.length,
    totalCount: source.length,

    search: view.search,
    severities: view.severities,
    statuses: view.statuses,
    category: view.category,
    day: view.day,
    hasActiveFilters:
      view.search.trim() !== '' ||
      view.severities.length > 0 ||
      view.statuses.length > 0 ||
      view.category !== null ||
      view.day !== null,
    setSearch,
    toggleSeverity,
    selectCategory,
    selectDay,
    clearStatuses,
    applyPreset,
    isPresetActive,
    clearFilters,

    sort: view.sort,
    toggleSort,

    page: currentPage,
    pageCount,
    goToPage,

    selectedIncident,
    selectIncident,
    selectAdjacentIncident,
    hasAdjacentIncident,
    closeIncident,
  };
}
