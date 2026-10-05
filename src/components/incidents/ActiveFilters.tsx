/**
 * Chips de los filtros que se activaron desde otro sitio.
 *
 * La severidad, la búsqueda, la categoría y el responsable no aparecen aquí:
 * sus controles ya muestran que están activos. El día y el estado sí, porque
 * se activan desde lejos —una barra del panel, un día del calendario, una
 * tarjeta de indicador— y sin esto el listado quedaría recortado sin nada
 * visible que explique por qué.
 *
 * Cada chip es un botón que deshace su filtro. Un filtro que no se puede
 * quitar desde donde se ve es una trampa.
 */

import { X } from 'lucide-react';

import { STATUS_META, UNRESOLVED_STATUSES } from '@/lib/catalog';
import { formatLongDateTime, formatShortDate } from '@/lib/format';
import type { IncidentStatus } from '@/types';

interface ActiveFiltersProps {
  readonly day: string | null;
  readonly statuses: readonly IncidentStatus[];
  readonly onClearDay: () => void;
  readonly onClearStatuses: () => void;
}

interface FilterChipProps {
  readonly label: string;
  readonly title: string;
  readonly onRemove: () => void;
}

function FilterChip({ label, title, onRemove }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onRemove}
      title={title}
      aria-label={`Quitar filtro: ${label}`}
      className="inline-flex h-7 items-center gap-1.5 rounded-pill bg-accent-soft px-2.5 text-xs font-semibold text-accent-text transition-[background-color,transform] duration-150 hover:bg-surface-hover active:scale-95"
    >
      {label}
      <X aria-hidden="true" className="size-3" />
    </button>
  );
}

/**
 * Nombre corto del conjunto de estados.
 *
 * El caso frecuente son los tres estados sin resolver a la vez, y enumerarlos
 * ("Abierto, En investigación, Contenido") ocuparía media línea para decir algo
 * que tiene un nombre de dos palabras.
 */
function describeStatuses(statuses: readonly IncidentStatus[]): string {
  const isUnresolvedSet =
    statuses.length === UNRESOLVED_STATUSES.length &&
    UNRESOLVED_STATUSES.every((status) => statuses.includes(status));

  if (isUnresolvedSet) return 'Sin resolver';

  return statuses.map((status) => STATUS_META[status].label).join(', ');
}

export function ActiveFilters({ day, statuses, onClearDay, onClearStatuses }: ActiveFiltersProps) {
  const hasDay = day !== null;
  const hasStatuses = statuses.length > 0;

  if (!hasDay && !hasStatuses) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4.5 pb-3">
      <span className="text-xs text-text-muted">Recorte aplicado:</span>

      {hasStatuses && (
        <FilterChip
          label={describeStatuses(statuses)}
          title={`Estado: ${statuses.map((status) => STATUS_META[status].label).join(', ')}`}
          onRemove={onClearStatuses}
        />
      )}

      {hasDay && (
        <FilterChip
          // `T12:00` evita que la conversión a hora local mueva la etiqueta un día.
          label={formatShortDate(`${day}T12:00:00`)}
          title={formatLongDateTime(`${day}T12:00:00`)}
          onRemove={onClearDay}
        />
      )}
    </div>
  );
}
