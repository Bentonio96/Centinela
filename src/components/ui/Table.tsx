/**
 * Primitivas de tabla sobre HTML semántico real: `table`, `thead`, `th`, `tr`.
 *
 * No hay `div` con `role="grid"`: una tabla nativa ya trae la navegación y el
 * anuncio de encabezados que los lectores de pantalla esperan, y reimplementar
 * eso con roles ARIA sólo agrega superficie donde equivocarse.
 */

import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';
import type { SortDirection } from '@/types';

interface TableProps extends ComponentPropsWithoutRef<'table'> {
  /** Descripción de la tabla para lectores de pantalla. */
  readonly caption: string;
}

export function Table({ caption, className, children, ...props }: TableProps) {
  return (
    // El contenedor absorbe el desborde horizontal en anchos intermedios, para
    // que la página nunca scrollee de lado.
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function Thead({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className={cn('border-b border-border-subtle bg-surface-sunken/60', className)}
      {...props}
    />
  );
}

export function Tbody({ className, ...props }: ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('divide-y divide-border-subtle', className)} {...props} />;
}

interface TrProps extends ComponentPropsWithoutRef<'tr'> {
  /** Añade el tratamiento de fila accionable: cursor, hover y foco visible. */
  readonly interactive?: boolean;
  readonly selected?: boolean;
}

export function Tr({ interactive = false, selected = false, className, ...props }: TrProps) {
  return (
    <tr
      className={cn(
        'transition-colors',
        interactive && 'cursor-pointer hover:bg-surface-hover focus-visible:bg-surface-hover',
        // El borde izquierdo marca la fila abierta sin depender sólo del fondo.
        selected && 'bg-accent-soft/40 shadow-[inset_2px_0_0_0_var(--accent)]',
        className,
      )}
      {...props}
    />
  );
}

type Align = 'left' | 'right';

const ALIGN_CLASSES: Readonly<Record<Align, string>> = {
  left: 'text-left',
  right: 'text-right',
};

interface ThProps extends Omit<ComponentPropsWithoutRef<'th'>, 'onClick'> {
  readonly align?: Align;
  /**
   * Dirección activa, o `null` si la tabla no está ordenada por esta columna.
   * Cuando se pasa junto a `onSort`, el encabezado se vuelve un botón.
   */
  readonly sortDirection?: SortDirection | null;
  readonly onSort?: () => void;
}

export function Th({
  align = 'left',
  sortDirection,
  onSort,
  className,
  children,
  ...props
}: ThProps) {
  const baseClassName = cn(
    'px-cell-x py-2 text-xs font-medium tracking-wide text-text-muted uppercase',
    ALIGN_CLASSES[align],
    className,
  );

  if (onSort === undefined) {
    return (
      <th scope="col" className={baseClassName} {...props}>
        {children}
      </th>
    );
  }

  const isSorted = sortDirection !== null && sortDirection !== undefined;
  const SortIcon = !isSorted ? ChevronsUpDown : sortDirection === 'asc' ? ChevronUp : ChevronDown;

  return (
    <th
      scope="col"
      // `aria-sort` es lo que anuncia el estado de orden; el icono es su equivalente visual.
      aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(baseClassName, 'p-0')}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'flex w-full items-center gap-1 px-cell-x py-2 font-medium tracking-wide uppercase transition-colors',
          'hover:text-text-primary',
          isSorted ? 'text-text-secondary' : 'text-text-muted',
          align === 'right' && 'justify-end',
        )}
      >
        {children}
        <SortIcon aria-hidden="true" className="size-3.5 shrink-0" />
      </button>
    </th>
  );
}

interface TdProps extends ComponentPropsWithoutRef<'td'> {
  readonly align?: Align;
}

export function Td({ align = 'left', className, ...props }: TdProps) {
  return (
    <td
      className={cn(
        'px-cell-x py-cell-y align-middle text-text-secondary',
        ALIGN_CLASSES[align],
        className,
      )}
      {...props}
    />
  );
}
