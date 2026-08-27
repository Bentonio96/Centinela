/**
 * Chips de los filtros emitidos desde los gráficos.
 *
 * La severidad, la búsqueda y la categoría no aparecen aquí: sus propios
 * controles ya muestran que están activos. El día sí, porque sólo se puede
 * activar con un clic en el gráfico, lejos de la tabla, y sin esto el listado
 * quedaría recortado sin nada visible que explique por qué.
 *
 * Cada chip es un botón que deshace su filtro. Un filtro que no se puede
 * quitar desde donde se ve es una trampa.
 */

import { X } from 'lucide-react';

import { formatLongDateTime, formatShortDate } from '@/lib/format';

interface ActiveFiltersProps {
  readonly day: string | null;
  readonly onClearDay: () => void;
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
      className="inline-flex h-7 items-center gap-1.5 rounded-control border border-accent bg-accent-soft px-2 text-xs font-medium text-text-primary transition-colors hover:border-border-strong"
    >
      {label}
      <X aria-hidden="true" className="size-3" />
    </button>
  );
}

export function ActiveFilters({ day, onClearDay }: ActiveFiltersProps) {
  if (day === null) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border-subtle px-gutter-sm py-2">
      <span className="text-xs text-text-muted">Día seleccionado en el gráfico:</span>
      <FilterChip
        // `T12:00` evita que la conversión a hora local mueva la etiqueta un día.
        label={formatShortDate(`${day}T12:00:00`)}
        title={formatLongDateTime(`${day}T12:00:00`)}
        onRemove={onClearDay}
      />
    </div>
  );
}
