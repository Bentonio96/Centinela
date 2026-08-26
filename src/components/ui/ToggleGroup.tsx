/**
 * Grupo de filtros de selección múltiple.
 *
 * Son botones con `aria-pressed`, no casillas: el patrón de "chip que se
 * enciende" es lo que describe `aria-pressed`, y así el grupo se recorre con
 * Tab como cualquier otra barra de herramientas.
 *
 * Genérico en `T` para que el llamador conserve su tipo de dominio en vez de
 * recibir un `string` de vuelta.
 */

import { cn } from '@/lib/cn';

export interface ToggleOption<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Punto de color del chip; refuerza la categoría sin ser el único indicio. */
  readonly dotClassName?: string;
  /** Clases aplicadas cuando la opción está activa. */
  readonly activeClassName?: string;
}

interface ToggleGroupProps<T extends string> {
  /** Nombre del grupo para lectores de pantalla, p. ej. "Filtrar por severidad". */
  readonly label: string;
  readonly options: readonly ToggleOption<T>[];
  readonly selected: readonly T[];
  readonly onToggle: (value: T) => void;
  readonly className?: string;
}

export function ToggleGroup<T extends string>({
  label,
  options,
  selected,
  onToggle,
  className,
}: ToggleGroupProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((option) => {
        const isActive = selected.includes(option.value);

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle(option.value)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-xs font-medium transition-colors',
              isActive
                ? (option.activeClassName ??
                  'border-accent bg-accent-soft text-text-primary')
                : 'border-border-subtle bg-transparent text-text-secondary hover:border-border-strong hover:text-text-primary',
            )}
          >
            {option.dotClassName !== undefined && (
              <span
                aria-hidden="true"
                className={cn(
                  'size-1.5 shrink-0 rounded-pill transition-opacity',
                  option.dotClassName,
                  !isActive && 'opacity-55',
                )}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
