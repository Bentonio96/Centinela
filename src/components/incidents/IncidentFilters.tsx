/**
 * Barra de filtros de la tabla: búsqueda libre y severidades.
 *
 * El recuento de resultados no vive aquí sino en la cabecera del panel, junto
 * al título: es el resultado de filtrar, no un control más.
 */

import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { ToggleGroup, type ToggleOption } from '@/components/ui/ToggleGroup';
import { SEVERITY_OPTIONS } from '@/lib/catalog';
import type { Severity } from '@/types';

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
  readonly hasActiveFilters: boolean;
  readonly onClearFilters: () => void;
}

export function IncidentFilters({
  search,
  onSearchChange,
  severities,
  onToggleSeverity,
  hasActiveFilters,
  onClearFilters,
}: IncidentFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border-subtle px-gutter-sm py-3 sm:flex-row sm:items-center sm:justify-between">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        label="Buscar incidentes"
        placeholder="Buscar por título, ID o activo…"
        className="sm:max-w-80"
      />

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
