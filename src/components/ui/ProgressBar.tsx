/**
 * Barra de progreso fina.
 *
 * Es `role="progressbar"` sólo cuando recibe una etiqueta: sin nombre
 * accesible un lector de pantalla anunciaría "barra de progreso, 72 %" sin
 * decir de qué, que es peor que no anunciarla.
 */

import { cn } from '@/lib/cn';

interface ProgressBarProps {
  /** Fracción de 0 a 1. Los valores fuera de rango se acotan al dibujar. */
  readonly value: number;
  readonly label?: string | undefined;
  /** Clases del relleno; por defecto, el verde medio de la marca. */
  readonly barClassName?: string | undefined;
  readonly className?: string | undefined;
}

export function ProgressBar({ value, label, barClassName, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div
      {...(label !== undefined
        ? {
            role: 'progressbar',
            'aria-label': label,
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': Math.round(clamped * 100),
          }
        : { 'aria-hidden': true })}
      className={cn('h-1.5 overflow-hidden rounded-pill bg-surface-sunken', className)}
    >
      <div
        className={cn('grow-x h-full rounded-pill', barClassName ?? 'bg-brand-600')}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
