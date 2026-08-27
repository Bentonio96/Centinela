/**
 * El estado de la vista, leído y escrito en la barra de direcciones.
 *
 * Filtros, búsqueda, orden, página e incidente abierto viven en la URL y no en
 * `useState`. En una herramienta de monitoreo eso no es un adorno: un analista
 * pega el enlace de "críticos sin resolver de ransomware" en el chat del turno,
 * y recargar durante un incidente no puede costarle el contexto.
 *
 * Todo lo que llega por aquí es entrada del usuario —la barra de direcciones es
 * editable— así que cada valor se valida contra el dominio antes de aceptarse.
 * Un parámetro inválido se descarta y cae al valor por defecto, en lugar de
 * propagar un tipo mentiroso al resto de la aplicación.
 */

import type { IncidentCategory, Severity, SortableColumn, SortDirection, SortState } from '@/types';
import { CATEGORIES, SEVERITIES, SORTABLE_COLUMNS } from '@/types';

/** Estado completo de la vista de incidentes. */
export interface ViewState {
  readonly search: string;
  readonly severities: readonly Severity[];
  /** Categoría filtrada, emitida por el gráfico de barras o por el selector. */
  readonly category: IncidentCategory | null;
  /** Día concreto `YYYY-MM-DD`, emitido al hacer clic en el gráfico de línea. */
  readonly day: string | null;
  readonly sort: SortState;
  readonly page: number;
  readonly selectedId: string | null;
}

/** Lo más reciente primero: es lo que un analista quiere ver al abrir el tablero. */
export const DEFAULT_SORT: SortState = { column: 'detectedAt', direction: 'desc' };

export const DEFAULT_VIEW_STATE: ViewState = {
  search: '',
  severities: [],
  category: null,
  day: null,
  sort: DEFAULT_SORT,
  page: 1,
  selectedId: null,
};

/** Nombres de los parámetros, en español porque la URL la lee una persona. */
const PARAM = {
  search: 'q',
  severities: 'sev',
  category: 'cat',
  day: 'dia',
  sort: 'orden',
  page: 'p',
  selected: 'inc',
} as const;

// Conjuntos para validar: `Set<Severity>` es asignable a `ReadonlySet<string>`,
// así que no hace falta ninguna aserción de tipo para consultarlos.
const SEVERITY_VALUES: ReadonlySet<string> = new Set(SEVERITIES);
const CATEGORY_VALUES: ReadonlySet<string> = new Set(CATEGORIES);
const COLUMN_VALUES: ReadonlySet<string> = new Set(SORTABLE_COLUMNS);

function isSeverity(value: string): value is Severity {
  return SEVERITY_VALUES.has(value);
}

function isCategory(value: string): value is IncidentCategory {
  return CATEGORY_VALUES.has(value);
}

function isSortableColumn(value: string): value is SortableColumn {
  return COLUMN_VALUES.has(value);
}

/** Lista separada por comas, descartando lo que no pertenezca al dominio. */
function parseList<T extends string>(
  raw: string | null,
  isValid: (value: string) => value is T,
): readonly T[] {
  if (raw === null || raw === '') return [];

  const seen = new Set<T>();
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (isValid(value)) {
      seen.add(value);
    }
  }
  return [...seen];
}

/** Una sola categoría válida, o nada. */
function parseCategory(raw: string | null): IncidentCategory | null {
  return raw !== null && isCategory(raw) ? raw : null;
}

/** `detectedAt:desc`. Cualquier otra cosa cae al orden por defecto. */
function parseSort(raw: string | null): SortState {
  if (raw === null) return DEFAULT_SORT;

  const [column, direction] = raw.split(':');
  if (column === undefined || !isSortableColumn(column)) return DEFAULT_SORT;

  const parsedDirection: SortDirection = direction === 'asc' ? 'asc' : 'desc';
  return { column, direction: parsedDirection };
}

/** Sólo se acepta `YYYY-MM-DD` que además sea una fecha real. */
function parseDay(raw: string | null): string | null {
  if (raw === null || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return Number.isNaN(Date.parse(`${raw}T12:00:00`)) ? null : raw;
}

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function parseViewState(queryString: string): ViewState {
  const params = new URLSearchParams(queryString);

  return {
    search: params.get(PARAM.search) ?? '',
    severities: parseList(params.get(PARAM.severities), isSeverity),
    category: parseCategory(params.get(PARAM.category)),
    day: parseDay(params.get(PARAM.day)),
    sort: parseSort(params.get(PARAM.sort)),
    page: parsePage(params.get(PARAM.page)),
    selectedId: params.get(PARAM.selected),
  };
}

/**
 * Serializa omitiendo todo lo que esté en su valor por defecto.
 * Sin eso, la vista inicial mostraría una URL llena de parámetros vacíos y
 * cualquier enlace compartido sería ilegible.
 */
export function toQueryString(state: ViewState): string {
  const params = new URLSearchParams();

  if (state.search.trim() !== '') params.set(PARAM.search, state.search);
  if (state.severities.length > 0) params.set(PARAM.severities, state.severities.join(','));
  if (state.category !== null) params.set(PARAM.category, state.category);
  if (state.day !== null) params.set(PARAM.day, state.day);

  if (state.sort.column !== DEFAULT_SORT.column || state.sort.direction !== DEFAULT_SORT.direction) {
    params.set(PARAM.sort, `${state.sort.column}:${state.sort.direction}`);
  }

  if (state.page > 1) params.set(PARAM.page, String(state.page));
  if (state.selectedId !== null) params.set(PARAM.selected, state.selectedId);

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

/** La URL completa que corresponde a un estado, conservando la ruta actual. */
export function toUrl(state: ViewState): string {
  return `${window.location.pathname}${toQueryString(state)}${window.location.hash}`;
}
