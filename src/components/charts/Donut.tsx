/**
 * Anillo de proporciones.
 *
 * Un solo círculo por porción, recortado con `stroke-dasharray`: es la forma
 * más corta de dibujar un anillo sin calcular arcos, y deja que el navegador
 * resuelva las juntas.
 *
 * El texto del centro es HTML superpuesto y no `<text>` de SVG, para que use
 * la misma tipografía y las mismas utilidades que el resto de la interfaz.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface DonutSlice {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** Color de la porción, normalmente un `var(--token)`. */
  readonly color: string;
}

interface DonutProps {
  readonly slices: readonly DonutSlice[];
  /** Descripción completa para lectores de pantalla. */
  readonly label: string;
  /** Contenido del centro: la cifra total y su unidad. */
  readonly children: ReactNode;
  readonly className?: string;
}

const SIZE = 160;
const STROKE = 24;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Separación entre porciones, en unidades de la circunferencia. */
const GAP = 3;

export function Donut({ slices, label, children, className }: DonutProps) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cursor = 0;

  return (
    <div className={cn('relative aspect-square', className)}>
      <svg
        role="img"
        aria-label={label}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        // Gira para que la primera porción arranque arriba y no a las tres.
        className="size-full -rotate-90"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={STROKE}
        />

        {total > 0 &&
          slices.map((slice) => {
            const length = (slice.value / total) * CIRCUMFERENCE;
            const start = cursor;
            cursor += length;
            if (length <= GAP) return null;

            return (
              <circle
                key={slice.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={slice.color}
                strokeWidth={STROKE}
                strokeDasharray={`${length - GAP} ${CIRCUMFERENCE - length + GAP}`}
                strokeDashoffset={-start}
              >
                <title>{`${slice.label}: ${slice.value}`}</title>
              </circle>
            );
          })}
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>{children}</div>
      </div>
    </div>
  );
}
