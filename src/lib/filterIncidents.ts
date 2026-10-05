/**
 * Filtrado, búsqueda y orden de incidentes.
 *
 * Son funciones puras y viven fuera del hook a propósito: se pueden probar sin
 * montar un componente, y `useIncidents` queda reducido a manejar estado.
 */

import type { Incident, IncidentFilters, SortState } from '@/types';
import { CATEGORY_META, SEVERITY_META, STATUS_META } from './catalog';
import { toLocalDateKey } from './format';

/**
 * Normaliza para comparar: sin acentos, en minúsculas.
 * Así "critica" encuentra "Crítica" y "ingenieria" encuentra "Ingeniería".
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase();
}

/**
 * Índice de búsqueda: un texto normalizado por incidente, calculado una vez.
 * Sin esto habría que reconstruir la cadena de cada incidente en cada
 * pulsación de tecla.
 */
export function createSearchIndex(incidents: readonly Incident[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>();

  for (const incident of incidents) {
    const haystack = [
      incident.id,
      incident.title,
      incident.description,
      incident.assignee,
      incident.sourceIp ?? '',
      SEVERITY_META[incident.severity].label,
      STATUS_META[incident.status].label,
      CATEGORY_META[incident.category].label,
      ...incident.affectedAssets.map((asset) => asset.name),
    ].join(' ');

    index.set(incident.id, normalize(haystack));
  }

  return index;
}

/**
 * Aplica la búsqueda y los filtros de severidad, estado, categoría, responsable
 * y día.
 * Una lista vacía significa "sin filtro", no "ninguna".
 */
export function filterIncidents(
  incidents: readonly Incident[],
  filters: IncidentFilters,
  searchIndex: ReadonlyMap<string, string>,
): Incident[] {
  const query = normalize(filters.search.trim());
  // Todos los términos deben aparecer, en cualquier orden.
  const terms = query.length > 0 ? query.split(/\s+/) : [];
  const severities = new Set(filters.severities);
  const statuses = new Set(filters.statuses);

  return incidents.filter((incident) => {
    if (severities.size > 0 && !severities.has(incident.severity)) {
      return false;
    }

    if (statuses.size > 0 && !statuses.has(incident.status)) {
      return false;
    }

    if (filters.category !== null && incident.category !== filters.category) {
      return false;
    }

    if (filters.assignee !== null && incident.assignee !== filters.assignee) {
      return false;
    }

    // El día se compara en hora local, igual que se agrupa en el gráfico: si no,
    // un incidente de las 23:00 caería en el punto del día siguiente.
    if (filters.day !== null && toLocalDateKey(new Date(incident.detectedAt)) !== filters.day) {
      return false;
    }

    if (terms.length === 0) {
      return true;
    }

    const haystack = searchIndex.get(incident.id);
    if (haystack === undefined) {
      return false;
    }

    return terms.every((term) => haystack.includes(term));
  });
}

/**
 * Valor comparable por columna.
 *
 * Severidad y estado se ordenan por su escala y no alfabéticamente: "Alta"
 * antes que "Crítica" sería correcto como texto y absurdo como triaje.
 */
function sortKey(incident: Incident, column: SortState['column']): string | number {
  switch (column) {
    case 'id':
      return incident.id;
    case 'title':
      return normalize(incident.title);
    case 'severity':
      return SEVERITY_META[incident.severity].weight;
    case 'status':
      return STATUS_META[incident.status].rank;
    case 'category':
      return normalize(CATEGORY_META[incident.category].label);
    case 'detectedAt':
      return incident.detectedAt;
  }
}

/**
 * Orden estable. Ante empate desempata por fecha de detección descendente,
 * para que ordenar por severidad no mezcle incidentes viejos con recientes.
 */
export function sortIncidents(incidents: readonly Incident[], sort: SortState): Incident[] {
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...incidents].sort((a, b) => {
    const keyA = sortKey(a, sort.column);
    const keyB = sortKey(b, sort.column);

    if (keyA < keyB) return -1 * direction;
    if (keyA > keyB) return 1 * direction;

    return b.detectedAt.localeCompare(a.detectedAt);
  });
}
