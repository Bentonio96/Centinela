/**
 * Área del período actual con el período anterior superpuesto.
 *
 * Se dibuja en píxeles reales —el ancho sale de un `ResizeObserver`— en vez de
 * estirar un `viewBox`: estirar deforma el texto de los ejes y engorda los
 * trazos de forma desigual.
 *
 * El período anterior va punteado y sin relleno. Dos áreas rellenas
 * superpuestas forman un bloque donde no se sabe cuál está encima; una línea
 * punteada se lee como referencia, que es lo que es.
 *
 * Accesibilidad: el gráfico es un `img` con un resumen, y los mismos datos
 * están en una tabla sólo para lectores de pantalla. Con teclado, el área
 * recibe foco y las flechas mueven la guía, así que el detalle por día no
 * depende del ratón.
 */

import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { useElementWidth } from '@/hooks/useElementSize';
import { cssVars } from '@/lib/cssVars';
import { formatLongDay, formatShortDate } from '@/lib/format';
import type { ThroughputPoint } from '@/lib/analytics';

const HEIGHT = 264;
const MARGIN = { top: 12, right: 10, bottom: 28, left: 30 } as const;
const TICKS = 4;
/** Ancho reservado al tooltip, para que no se salga por los lados. */
const TOOLTIP_HALF = 78;

interface AreaCompareProps {
  readonly points: readonly ThroughputPoint[];
  /** Resumen de lo que muestra, para lectores de pantalla. */
  readonly label: string;
}

/** Tope del eje: el menor múltiplo de `TICKS` que cubre el máximo. */
function axisMax(points: readonly ThroughputPoint[]): number {
  const max = Math.max(1, ...points.map((point) => Math.max(point.current, point.previous)));
  return Math.ceil(max / TICKS) * TICKS;
}

/** Qué índices llevan etiqueta en el eje X: todos si caben, si no cinco repartidos. */
function labelIndices(count: number, width: number): readonly number[] {
  const fits = Math.max(2, Math.floor(width / 72));
  if (count <= fits) return Array.from({ length: count }, (_, index) => index);

  const slots = Math.min(5, fits);
  return Array.from({ length: slots }, (_, slot) => Math.round((slot * (count - 1)) / (slots - 1)));
}

export function AreaCompare({ points, label }: AreaCompareProps) {
  const [containerRef, width] = useElementWidth<HTMLDivElement>();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const gradientId = useId();

  const count = points.length;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const yMax = axisMax(points);
  const step = count > 1 ? innerWidth / (count - 1) : 0;

  const x = (index: number) => MARGIN.left + index * step;
  const y = (value: number) => MARGIN.top + innerHeight * (1 - value / yMax);

  const toPath = (pick: (point: ThroughputPoint) => number) =>
    points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(pick(point))}`)
      .join(' ');

  const currentLine = toPath((point) => point.current);
  const previousLine = toPath((point) => point.previous);
  const area = `${currentLine} L${x(count - 1)} ${y(0)} L${x(0)} ${y(0)} Z`;

  const active = activeIndex === null ? undefined : points[activeIndex];

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (step === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.round((event.clientX - bounds.left - MARGIN.left) / step);
    setActiveIndex(Math.max(0, Math.min(count - 1, index)));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const delta = event.key === 'ArrowLeft' ? -1 : 1;
      setActiveIndex((current) =>
        Math.max(0, Math.min(count - 1, (current ?? count - 1) + (current === null ? 0 : delta))),
      );
    } else if (event.key === 'Escape') {
      setActiveIndex(null);
    }
  };

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={`${label}. Usa las flechas izquierda y derecha para recorrer los días.`}
      tabIndex={0}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setActiveIndex(null)}
      onKeyDown={handleKeyDown}
      onBlur={() => setActiveIndex(null)}
      className="relative rounded-control"
      style={{ height: HEIGHT }}
    >
      {/* El día bajo la guía, anunciado al moverla con el teclado. */}
      <p aria-live="polite" className="sr-only">
        {active !== undefined &&
          `${formatLongDay(new Date(`${active.date}T12:00:00`))}: ${active.current} en este período, ${active.previous} en el anterior`}
      </p>

      {width > 0 && count > 1 && (
        <svg aria-hidden="true" width={width} height={HEIGHT} className="block">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-2)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--series-2)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {Array.from({ length: TICKS + 1 }, (_, tick) => {
            const value = (yMax / TICKS) * tick;
            return (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="var(--grid-line)"
                  strokeWidth="1"
                />
                <text
                  x={MARGIN.left - 10}
                  y={y(value)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="tabular fill-text-muted text-[0.6875rem]"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {labelIndices(count, innerWidth).map((index) => {
            const point = points[index];
            if (point === undefined) return null;
            return (
              <text
                key={point.date}
                x={x(index)}
                y={HEIGHT - 8}
                // Las etiquetas de los extremos se anclan hacia dentro para no
                // cortarse contra el borde.
                textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
                className="fill-text-muted text-[0.6875rem]"
              >
                {formatShortDate(`${point.date}T12:00:00`)}
              </text>
            );
          })}

          <path d={area} fill={`url(#${gradientId})`} className="rise" />
          <path
            d={previousLine}
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
          <path
            d={currentLine}
            fill="none"
            stroke="var(--series-2)"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            // `pathLength` normaliza la longitud a 1: la animación de trazado
            // no necesita medir el path.
            pathLength={1}
            className="draw"
            style={cssVars({ '--draw-length': '1' })}
          />

          {active !== undefined && activeIndex !== null && (
            <g>
              <line
                x1={x(activeIndex)}
                x2={x(activeIndex)}
                y1={MARGIN.top}
                y2={y(0)}
                stroke="var(--border-strong)"
                strokeWidth="1"
              />
              <circle
                cx={x(activeIndex)}
                cy={y(active.previous)}
                r="3.5"
                fill="var(--surface-card)"
                stroke="var(--text-muted)"
                strokeWidth="1.5"
              />
              <circle
                cx={x(activeIndex)}
                cy={y(active.current)}
                r="4.5"
                fill="var(--series-2)"
                stroke="var(--surface-card)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      )}

      {active !== undefined && activeIndex !== null && (
        <div
          // Sólo visual: los datos completos están en la tabla de abajo.
          aria-hidden="true"
          className="pointer-events-none absolute top-2 w-39 -translate-x-1/2 rounded-control bg-surface-overlay px-3 py-2 text-xs shadow-popover ring-1 ring-border-subtle"
          style={{
            left: Math.max(TOOLTIP_HALF, Math.min(width - TOOLTIP_HALF, x(activeIndex))),
          }}
        >
          <p className="font-semibold text-text-primary first-letter:uppercase">
            {formatLongDay(new Date(`${active.date}T12:00:00`))}
          </p>
          <p className="mt-1.5 flex items-center justify-between gap-3 text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-pill bg-series-2" />
              Este período
            </span>
            <span className="tabular font-semibold text-text-primary">{active.current}</span>
          </p>
          <p className="mt-1 flex items-center justify-between gap-3 text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dotted border-text-muted" />
              Anterior
            </span>
            <span className="tabular font-semibold text-text-primary">{active.previous}</span>
          </p>
        </div>
      )}

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Día</th>
            <th scope="col">Este período</th>
            <th scope="col">Período anterior</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatShortDate(`${point.date}T12:00:00`)}</th>
              <td>{point.current}</td>
              <td>{point.previous}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
