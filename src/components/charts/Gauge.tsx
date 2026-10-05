/**
 * Medidor semicircular segmentado.
 *
 * Cada segmento es el mismo arco con un `stroke-dasharray` distinto: así todos
 * comparten centro y radio exactos y no hay que calcular un punto de inicio y
 * de fin por tramo.
 *
 * Los extremos redondeados salen de una máscara —un trazo con `linecap`
 * redondo sobre el arco completo— y no de redondear cada segmento: redondear
 * cada uno dejaría medias lunas en las juntas interiores. Esa misma máscara es
 * la que se anima al montar, y el medidor se "dibuja" de izquierda a derecha.
 */

import { useId } from 'react';

import { cssVars } from '@/lib/cssVars';

export interface GaugeSegment {
  readonly key: string;
  readonly value: number;
  /** Color del tramo, normalmente un `var(--token)`. Se ignora si es rayado. */
  readonly color: string;
  readonly hatched?: boolean;
}

interface GaugeProps {
  readonly segments: readonly GaugeSegment[];
  /** Descripción completa para lectores de pantalla. */
  readonly label: string;
  readonly className?: string;
}

const WIDTH = 220;
const STROKE = 30;
const RADIUS = 92;
const CENTER_X = WIDTH / 2;
const CENTER_Y = RADIUS + STROKE / 2;
/** El `linecap` redondo sobresale medio grosor por debajo de la base. */
const HEIGHT = CENTER_Y + STROKE / 2;
const ARC = `M ${CENTER_X - RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${CENTER_X + RADIUS} ${CENTER_Y}`;
const LENGTH = Math.PI * RADIUS;
/** Separación entre tramos, en unidades del arco. */
const GAP = 3;

export function Gauge({ segments, label, className }: GaugeProps) {
  const id = useId();
  const maskId = `${id}-mask`;
  const hatchId = `${id}-hatch`;

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  let cursor = 0;

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={className}>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={WIDTH} height={HEIGHT}>
          <path
            d={ARC}
            fill="none"
            stroke="#fff"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className="draw"
            style={cssVars({ '--draw-length': `${LENGTH}`, '--rise-delay': '180ms' })}
          />
        </mask>
        <pattern
          id={hatchId}
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
          patternTransform="rotate(45)"
        >
          <rect width="6" height="6" fill="var(--hatch)" opacity="0.22" />
          <rect width="1.6" height="6" fill="var(--hatch)" />
        </pattern>
      </defs>

      <g mask={`url(#${maskId})`}>
        {/* Pista de fondo: con cero incidentes el medidor sigue teniendo forma. */}
        <path d={ARC} fill="none" stroke="var(--surface-sunken)" strokeWidth={STROKE} />

        {total > 0 &&
          segments.map((segment) => {
            const length = (segment.value / total) * LENGTH;
            const start = cursor;
            cursor += length;
            if (length <= 0) return null;

            return (
              <path
                key={segment.key}
                d={ARC}
                fill="none"
                stroke={segment.hatched === true ? `url(#${hatchId})` : segment.color}
                strokeWidth={STROKE}
                // El último tramo no deja hueco: el borde lo pone la máscara.
                strokeDasharray={`${Math.max(0, length - (cursor >= LENGTH - 0.01 ? 0 : GAP))} ${LENGTH}`}
                strokeDashoffset={-start}
              />
            );
          })}
      </g>
    </svg>
  );
}
