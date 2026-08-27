/**
 * Barra de filtros de la tabla: búsqueda libre, categoría y severidades.
 *
 * El selector de categoría existe además del gráfico de barras, no en lugar de
 * él. Filtrar haciendo clic en una barra es cómodo con el ratón, pero sería la
 * única vía para llegar a ese filtro, y con el teclado no hay forma de pulsar
 * una barra. Un `<select>` nativo lo resuelve sin inventar nada: llega por Tab,
 * se abre con el teclado y lo anuncian los lectores de pantalla.
 *
 * El recuento de resultados no vive aquí sino en la cabecera del panel, junto
 * al título: es el resultado de filtrar, no un control más.
 */

import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { ToggleGroup, type ToggleOption } from '@/components/ui/ToggleGroup';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS } from '@/lib/catalog';
import type { IncidentCategory, Severity } from '@/types';

/** Las opciones no dependen de las props: se construyen una sola vez. */
const SEVERITY_TOGGLES: readonly ToggleOption<Severity>[] = SEVERITY_OPTIONS.map((meta) => ({
  value: meta.value,
  label: meta.label,
  dotClassName: meta.dotClassName,
  activeClassName: meta.badgeClassName,
}));

interface IncidentFiltersProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly severities: readonly Severity[];
  readonly onToggleSeverity: (severity: Severity) => void;
  readonly category: IncidentCategory | null;
  readonly onSelectCategory: (category: IncidentCategory | null) => void;
  readonly hasActiveFilters: boolean;
  readonly onClearFilters: () => void;
}

/** El valor del `<option>` que representa "sin filtro". */
const ALL_CATEGORIES = '';

export function IncidentFilters({
  search,
  onSearchChange,
  severities,
  onToggleSeverity,
  category,
  onSelectCategory,
  hasActiveFilters,
  onClearFilters,
}: IncidentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border-subtle px-gutter-sm py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          label="Buscar incidentes"
          placeholder="Buscar por título, ID o activo…"
          className="sm:w-72"
        />

        <div>
          <label htmlFor="filtro-categoria" className="sr-only">
            Filtrar por categoría
          </label>
          <select
            id="filtro-categoria"
            value={category ?? ALL_CATEGORIES}
            onChange={(event) => {
              // El valor viaja como `string`; se resuelve contra el catálogo
              // para recuperar el tipo del dominio sin una aserción.
              const match = CATEGORY_OPTIONS.find((option) => option.value === event.target.value);
              onSelectCategory(match?.value ?? null);
            }}
            className="h-9 rounded-control border border-border-subtle bg-surface-sunken px-2.5 text-sm text-text-primary transition-colors hover:border-border-strong focus:border-accent focus:outline-none"
          >
            <option value={ALL_CATEGORIES}>Todas las categorías</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ToggleGroup
          label="Filtrar por severidad"
          options={SEVERITY_TOGGLES}
          selected={severities}
          onToggle={onToggleSeverity}
        />

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X aria-hidden="true" className="size-3.5" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}
