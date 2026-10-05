/**
 * Superficie contenedora: la baldosa del bento.
 *
 * Casi blanca sobre el panel gris verdoso, con un radio generoso y una sombra
 * corta. No hay borde en claro —el contraste de superficies basta— pero sí en
 * oscuro, donde dos verdes casi negros no se separan solos.
 */

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

type CardElement = 'div' | 'section' | 'article';

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  /** Etiqueta a renderizar. `section` cuando el bloque tiene su propio título. */
  readonly as?: CardElement;
  /** Eleva la tarjeta al pasar por encima. Sólo si la tarjeta es accionable. */
  readonly interactive?: boolean;
}

export function Card({
  as: Component = 'div',
  interactive = false,
  className,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        'rounded-card bg-surface-card shadow-card dark:ring-1 dark:ring-border-subtle',
        interactive &&
          'transition-[transform,box-shadow] duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-lift',
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
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4.5 pt-4',
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
      className={cn('text-[0.9375rem] leading-tight font-semibold text-text-primary', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('mt-0.5 text-xs text-text-muted', className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-4.5 py-4', className)} {...props} />;
}
