/**
 * Grupo de píldoras de selección única.
 *
 * Son botones con `aria-pressed` dentro de un `group` con nombre, no pestañas:
 * no cambian de panel, recortan el mismo contenido. Genérico en `T` para que
 * el llamador conserve su tipo de dominio en vez de recibir un `string`.
 */

import { cn } from '@/lib/cn';

export interface PillOption<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

interface PillGroupProps<T extends string | number> {
  /** Nombre del grupo para lectores de pantalla, p. ej. "Filtrar el tablero". */
  readonly label: string;
  readonly options: readonly PillOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly className?: string;
}

export function PillGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
}: PillGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full flex-wrap gap-1 rounded-[1.375rem] bg-surface-card p-1 shadow-card',
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-8 rounded-pill px-3.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150',
              isActive
                ? 'bg-accent text-accent-contrast shadow-[inset_0_1px_0_rgb(255_255_255/0.16)]'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
