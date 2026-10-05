/**
 * Barra de filtros de la tabla: búsqueda, categoría, responsable y
 * severidades.
 *
 * Categoría y responsable son `<select>` nativos: llegan por Tab, se abren con
 * el teclado y los anuncian los lectores de pantalla sin inventar nada. La
 * severidad son chips con `aria-pressed` porque es de selección múltiple —
 * filtrar por "crítica y alta" a la vez es triaje corriente— y un `<select
 * multiple>` es de los controles peor resueltos de la plataforma.
 *
 * El atajo de `/` se registra aquí y no en la raíz porque el campo que enfoca
 * vive aquí. Un atajo global cuyo destino está tres componentes más abajo
 * obliga a pasar una `ref` por toda la cadena para no ganar nada.
 */

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { CONTROL_CLASS } from '@/components/ui/control';
import { SearchInput } from '@/components/ui/SearchInput';
import { TEAM } from '@/data/team';
import { CATEGORY_OPTIONS, SEVERITY_OPTIONS } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { hasModifier, isTypingTarget } from '@/lib/keyboard';
import type { IncidentCategory, Severity } from '@/types';

interface IncidentFiltersProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly severities: readonly Severity[];
  readonly onToggleSeverity: (severity: Severity) => void;
  readonly category: IncidentCategory | null;
  readonly onSelectCategory: (category: IncidentCategory | null) => void;
  readonly assignee: string | null;
  readonly onSelectAssignee: (assignee: string | null) => void;
  readonly hasActiveFilters: boolean;
  readonly onClearFilters: () => void;
}

/** El valor del `<option>` que representa "sin filtro". */
const ALL = '';

const SELECT_CLASS = cn(CONTROL_CLASS, 'h-10 w-auto rounded-pill pr-8');

export function IncidentFilters({
  search,
  onSearchChange,
  severities,
  onToggleSeverity,
  category,
  onSelectCategory,
  assignee,
  onSelectAssignee,
  hasActiveFilters,
  onClearFilters,
}: IncidentFiltersProps) {
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || hasModifier(event)) return;
      // Sin esta guarda, escribir una barra en cualquier campo movería el foco.
      if (isTypingTarget(event.target)) return;
      // Con un diálogo abierto, la tabla está inerte: no hay campo que enfocar.
      if (document.querySelector('dialog[open]') !== null) return;

      // El `preventDefault` evita que la barra acabe escrita en el campo que
      // se acaba de enfocar, y que Firefox abra su búsqueda rápida.
      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    // Una sola fila que envuelve: en un ancho intermedio los controles bajan
    // de a uno, en vez de partirse en dos grupos que se descuadran entre sí.
    <div className="flex flex-wrap items-center gap-2.5 px-4.5 py-3.5">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        label="Buscar incidentes"
        placeholder="Buscar por título, ID o activo…"
        inputRef={searchRef}
        shortcutHint="/"
        className="w-full sm:w-72"
      />

      <div>
        <label htmlFor="filtro-categoria" className="sr-only">
          Filtrar por categoría
        </label>
        <select
          id="filtro-categoria"
          value={category ?? ALL}
          onChange={(event) => {
            // El valor viaja como `string`; se resuelve contra el catálogo
            // para recuperar el tipo del dominio sin una aserción.
            const match = CATEGORY_OPTIONS.find((option) => option.value === event.target.value);
            onSelectCategory(match?.value ?? null);
          }}
          className={SELECT_CLASS}
        >
          <option value={ALL}>Todas las categorías</option>
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="filtro-responsable" className="sr-only">
          Filtrar por responsable
        </label>
        <select
          id="filtro-responsable"
          value={assignee ?? ALL}
          onChange={(event) => {
            onSelectAssignee(event.target.value === ALL ? null : event.target.value);
          }}
          className={SELECT_CLASS}
        >
          <option value={ALL}>Todo el equipo</option>
          {TEAM.map((analyst) => (
            <option key={analyst.name} value={analyst.name}>
              {analyst.name}
            </option>
          ))}
        </select>
      </div>

      <div
        role="group"
        aria-label="Filtrar por severidad"
        className="flex flex-wrap gap-1.5 xl:ml-auto"
      >
        {SEVERITY_OPTIONS.map((option) => {
          const isActive = severities.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onToggleSeverity(option.value)}
              className={cn(
                'inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-xs font-semibold transition-colors',
                isActive
                  ? option.badgeClassName
                  : 'border-border-subtle text-text-secondary hover:border-border-strong hover:text-text-primary',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-1.5 shrink-0 rounded-pill transition-opacity',
                  option.dotClassName,
                  !isActive && 'opacity-60',
                )}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClearFilters}>
          <X aria-hidden="true" className="size-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
