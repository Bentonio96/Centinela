/**
 * Etiqueta compacta.
 *
 * El color llega siempre por `className` desde el catálogo del dominio, y el
 * texto del badge nunca se omite: el color acompaña a la palabra, no la
 * reemplaza. El punto es un tercer refuerzo para quien distinga mal los tonos.
 */

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  /** Clases del punto indicador. Si se omite, no se dibuja. */
  readonly dotClassName?: string;
}

export function Badge({ dotClassName, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        className,
      )}
      {...props}
    >
      {dotClassName !== undefined && (
        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-pill', dotClassName)} />
      )}
      {children}
    </span>
  );
}
