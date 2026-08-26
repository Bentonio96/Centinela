/**
 * Superficie contenedora. Un borde de 1px y un fondo elevado bastan para
 * separar el contenido del fondo: en una herramienta densa las sombras
 * acumuladas ensucian más de lo que ordenan.
 */

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

type CardElement = 'div' | 'section' | 'article';

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  /** Etiqueta a renderizar. `section` cuando el bloque tiene su propio título. */
  readonly as?: CardElement;
}

export function Card({ as: Component = 'div', className, ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-card border border-border-subtle bg-surface-raised',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-subtle px-gutter-sm py-3',
        className,
      )}
      {...props}
    />
  );
}

interface CardTitleProps extends ComponentPropsWithoutRef<'h2'> {
  readonly as?: 'h2' | 'h3';
}

export function CardTitle({ as: Component = 'h2', className, ...props }: CardTitleProps) {
  return (
    <Component
      className={cn('text-sm font-semibold text-text-primary', className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-gutter-sm py-gutter-sm', className)} {...props} />;
}
