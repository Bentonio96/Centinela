/**
 * Mini-gráfico de una sola serie, dibujado a mano en SVG.
 *
 * No usa Recharts a propósito. Recharts monta un `ResponsiveContainer` con su
 * observador de tamaño y su motor de ejes para cada instancia; aquí hay cuatro
 * de estos en pantalla y lo único que hace falta es una `path`. Son treinta
 * líneas de trigonometría de secundaria contra un contenedor que pesa y
 * observa. Además así el degradado usa los mismos tokens que el resto.
 *
 * Es `aria-hidden` deliberadamente: la tarjeta ya anuncia el valor actual y su
 * variación, que es la información. La curva añade el matiz de la forma, y una
 * descripción textual de una forma —"sube, baja, vuelve a subir"— no le sirve
 * a nadie. Repetirla sería ruido para quien navega con lector de pantalla.
 */

import { useId } from 'react';

import { cn } from '@/lib/cn';

const VIEW_W = 100;
const VIEW_H = 32;
/** Aire arriba y abajo para que el trazo no se corte contra el borde. */
const PAD_Y = 3;

interface SparklineProps {
  readonly values: readonly number[];
  /** Color del trazo y del degradado, normalmente un `var(--token)`. */
  readonly color: string;
  /** Clases del SVG. Debe incluir el alto; por defecto, `h-8`. */
  readonly className?: string;
}

/** Coordenadas normalizadas de la serie dentro del `viewBox`. */
function toPoints(values: readonly number[]): readonly (readonly [number, number])[] {
  const max = Math.max(...values);
  const min = Math.min(...values);
  // Una serie plana no tiene rango que escalar: se dibuja por el centro.
  const span = max - min || 1;
  const step = values.length > 1 ? VIEW_W / (values.length - 1) : 0;

  return values.map((value, index) => {
    const ratio = max === min ? 0.5 : (value - min) / span;
    const y = VIEW_H - PAD_Y - ratio * (VIEW_H - PAD_Y * 2);
    return [index * step, y] as const;
  });
}

export function Sparkline({ values, color, className }: SparklineProps) {
  const gradientId = useId();

  if (values.length < 2) return null;

  const points = toPoints(values);
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  // El área cierra contra la base del `viewBox` para rellenar bajo la curva.
  const area = `${line} L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      // El `viewBox` se estira al ancho disponible; `non-scaling-stroke` evita
      // que el trazo se estire con él y quede de grosor desigual.
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className ?? 'h-8')}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
