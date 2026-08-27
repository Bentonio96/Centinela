/**
 * Superficie contenedora, resuelta como vidrio: fondo translúcido, desenfoque
 * de lo que hay detrás y un filo iluminado en el borde superior.
 *
 * La translucidez no es sólo decorativa — es lo que deja ver la capa
 * atmosférica del fondo y da profundidad a la pila de superficies. Lo que sí
 * se mantiene contenido son las sombras: se aplican al pasar el cursor, no en
 * reposo, porque ocho tarjetas con sombra permanente vuelven a ensuciar
 * exactamente lo que se quería ordenar.
 */

import type { ComponentPropsWithoutRef } from 'react';

import { useSpotlight } from '@/hooks/useSpotlight';
import { cn } from '@/lib/cn';

type CardElement = 'div' | 'section' | 'article';

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  /** Etiqueta a renderizar. `section` cuando el bloque tiene su propio título. */
  readonly as?: CardElement;
  /** Enciende el foco que sigue al cursor. Reservado a las tarjetas pequeñas. */
  readonly spotlight?: boolean;
  /** Eleva la tarjeta al pasar por encima. Sólo si la tarjeta es accionable. */
  readonly interactive?: boolean;
}

export function Card({
  as: Component = 'div',
  spotlight = false,
  interactive = false,
  className,
  ...props
}: CardProps) {
  const spot = useSpotlight();

  return (
    <Component
      // La `ref` sólo se conecta cuando el foco está activo; el hook no hace
      // nada si nadie llama a sus manejadores.
      {...(spotlight
        ? {
            ref: spot.ref,
            onPointerMove: spot.onPointerMove,
            onPointerLeave: spot.onPointerLeave,
          }
        : {})}
      className={cn(
        'surface-glass rounded-card shadow-card',
        spotlight && 'spotlight',
        interactive &&
          'transition-[transform,box-shadow,border-color] duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift',
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
        'relative flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border-subtle px-gutter-sm py-3',
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
    <Component className={cn('text-sm font-semibold text-text-primary', className)} {...props} />
  );
}

export function CardBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('relative px-gutter-sm py-gutter-sm', className)} {...props} />;
}
