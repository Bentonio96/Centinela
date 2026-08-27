/**
 * Tarjeta de indicador: valor actual, su variación contra el período previo y
 * la forma que tuvo la métrica durante la ventana observada.
 *
 * Una variación no significa lo mismo en todas las métricas: que suban los
 * incidentes abiertos es malo, que suban los resueltos es bueno. Por eso el
 * signo no decide el color por sí solo — lo hace junto a `higherIsBetter`.
 *
 * La tarjeta es además el control que abre su propio filtro. Era la pieza más
 * visible del tablero y la única inerte: se veía "5 críticos sin resolver" y no
 * había forma de preguntar cuáles. El botón cubre la tarjeta entera en lugar de
 * ser un enlace aparte, porque el objetivo de pulsación es la tarjeta.
 */

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { Sparkline } from '@/components/ui/Sparkline';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/cn';
import { formatDelta, formatSignedNumber } from '@/lib/format';
import type { MetricDelta } from '@/types';

type DeltaTone = 'good' | 'bad' | 'neutral';

const TONE_CLASSES: Readonly<Record<DeltaTone, string>> = {
  good: 'text-status-resolved',
  bad: 'text-severity-critical',
  neutral: 'text-text-muted',
};

/**
 * Identidad cromática de cada indicador.
 *
 * Un solo token semántico decide el icono, el halo de fondo y el color de la
 * curva, para que los tres no puedan desincronizarse. Las clases se escriben
 * literales porque Tailwind escanea el código y no resuelve concatenaciones.
 */
export type MetricTone = 'open' | 'critical' | 'duration' | 'resolved';

interface ToneMeta {
  readonly iconClassName: string;
  /** Baldosa degradada tras el icono. */
  readonly tileClassName: string;
  /** Halo radial de la esquina superior derecha. */
  readonly glow: string;
  /** Color del sparkline. */
  readonly series: string;
}

const METRIC_TONE: Readonly<Record<MetricTone, ToneMeta>> = {
  open: {
    iconClassName: 'text-status-open',
    tileClassName: 'from-status-open/25 to-status-open/5 ring-status-open/20',
    glow: 'var(--glow-high)',
    series: 'var(--status-open)',
  },
  critical: {
    iconClassName: 'text-severity-critical',
    tileClassName: 'from-severity-critical/25 to-severity-critical/5 ring-severity-critical/20',
    glow: 'var(--glow-critical)',
    series: 'var(--severity-critical)',
  },
  duration: {
    iconClassName: 'text-severity-medium',
    tileClassName: 'from-severity-medium/25 to-severity-medium/5 ring-severity-medium/20',
    glow: 'var(--glow-medium)',
    series: 'var(--severity-medium)',
  },
  resolved: {
    iconClassName: 'text-status-resolved',
    tileClassName: 'from-status-resolved/25 to-status-resolved/5 ring-status-resolved/20',
    glow: 'var(--glow-resolved)',
    series: 'var(--status-resolved)',
  },
};

interface MetricCardProps {
  readonly label: string;
  /** Valor en bruto. La tarjeta lo anima; `format` decide cómo se escribe. */
  readonly value: number;
  readonly format: (value: number) => string;
  readonly delta: MetricDelta;
  /**
   * Cómo escribir la diferencia absoluta cuando no hay porcentaje.
   * Por defecto se formatea como un entero con signo.
   */
  readonly formatAbsolute?: (value: number) => string;
  /** Si un aumento en esta métrica es una buena noticia. */
  readonly higherIsBetter: boolean;
  /** Contra qué se compara: "vs. semana anterior". */
  readonly comparison: string;
  readonly icon: LucideIcon;
  readonly tone: MetricTone;
  /** Serie diaria de la métrica en la ventana observada. */
  readonly series: readonly number[];
  /**
   * Filtra la tabla por esta métrica.
   *
   * Es opcional porque no toda métrica tiene un conjunto de incidentes debajo:
   * el tiempo medio de resolución es un promedio, y su recorte natural
   * —"resueltos"— ya lo abre la tarjeta de al lado. Dos botones que llevan al
   * mismo sitio no son un atajo, son una duda.
   */
  readonly onSelect?: (() => void) | undefined;
  /** Si la tabla ya está mostrando exactamente este recorte. */
  readonly active?: boolean | undefined;
  /** Qué anuncia el botón que hace: "Filtrar por críticos sin resolver". */
  readonly actionLabel?: string | undefined;
}

export function MetricCard({
  label,
  value,
  format,
  delta,
  higherIsBetter,
  comparison,
  icon: Icon,
  tone,
  series,
  onSelect,
  active = false,
  actionLabel,
  formatAbsolute = formatSignedNumber,
}: MetricCardProps) {
  const meta = METRIC_TONE[tone];
  const animated = useCountUp(value);
  const isActionable = onSelect !== undefined && actionLabel !== undefined;

  // Con base cero no hay porcentaje que mostrar, pero sí una diferencia real.
  const formattedDelta =
    delta.percent === null ? formatAbsolute(delta.absolute) : formatDelta(delta.percent);

  // El sentido del cambio sale del porcentaje si existe y del absoluto si no.
  const direction = Math.sign(Math.round(delta.percent ?? delta.absolute));

  const deltaTone: DeltaTone =
    direction === 0 ? 'neutral' : direction > 0 === higherIsBetter ? 'good' : 'bad';

  const DeltaIcon = direction === 0 ? Minus : direction > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      as="article"
      spotlight
      interactive={isActionable}
      className={cn(
        // Columna flexible con alto mínimo para que la curva pueda anclarse
        // abajo: los títulos ocupan una, dos o tres líneas según el ancho, y
        // sin esto la línea base de cada tarjeta caería a distinta altura.
        'relative isolate flex min-h-36 flex-col overflow-hidden',
        active && 'border-accent ring-1 ring-accent/40',
      )}
    >
      {/* Halo semántico. Es un nodo propio y no una sombra porque tiene que
          quedar recortado por el radio de la tarjeta. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: `radial-gradient(14rem circle at 88% -10%, ${meta.glow}, transparent 70%)` }}
      />

      <div className="px-gutter-sm pt-3.5 pb-2">
        <div className="flex items-start justify-between gap-2">
          {/* Un punto más pequeño en móvil: a dos columnas sobre 390px,
              "TIEMPO MEDIO DE RESOLUCIÓN" ocupaba tres líneas a 12px. */}
          <h3 className="text-[0.6875rem] leading-tight font-medium tracking-wide text-text-muted uppercase sm:text-xs">
            {label}
          </h3>
          <span
            aria-hidden="true"
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-control bg-gradient-to-br ring-1',
              meta.tileClassName,
            )}
          >
            <Icon className={cn('size-4', meta.iconClassName)} />
          </span>
        </div>

        <p className="tabular mt-2 text-2xl leading-none font-semibold text-text-primary">
          {format(animated)}
        </p>

        <p className="mt-2.5 flex flex-wrap items-center gap-x-1 text-xs">
          {/* La cifra y su flecha no se separan nunca: en móvil el "%" caía a
              la línea siguiente y se leía como un dato distinto. */}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <DeltaIcon
              aria-hidden="true"
              className={cn('size-3.5 shrink-0', TONE_CLASSES[deltaTone])}
            />
            <span className={cn('tabular font-medium', TONE_CLASSES[deltaTone])}>
              {formattedDelta}
            </span>
          </span>
          <span className="text-text-muted">{comparison}</span>
        </p>
      </div>

      {/* A sangre contra el borde inferior: la curva es un fondo, no un dato
          más de la retícula, y encuadrarla la volvería un cuarto elemento.
          `mt-auto` la ancla abajo, así todas las tarjetas de una fila alinean
          su curva aunque sus títulos ocupen distinto número de líneas. */}
      <Sparkline values={series} color={meta.series} className="mt-auto" />

      {isActionable && (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={active}
          aria-label={actionLabel}
          title={actionLabel}
          className="absolute inset-0 rounded-card"
        />
      )}
    </Card>
  );
}
