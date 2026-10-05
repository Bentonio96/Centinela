/**
 * Tarjeta de indicador: valor actual y su variación contra el período previo.
 *
 * Una variación no significa lo mismo en todas las métricas: que suban los
 * incidentes abiertos es malo, que suban los resueltos es bueno. Por eso el
 * signo no decide el color por sí solo — lo hace junto a `higherIsBetter`.
 *
 * La tarjeta entera es el control que abre su propio recorte. Se leía "5
 * críticos sin resolver" y no había forma de preguntar cuáles; el botón cubre
 * la tarjeta en lugar de ser un enlace aparte, porque el objetivo de pulsación
 * es la tarjeta. La flecha de la esquina es la pista visual de que se puede.
 *
 * `hero` la pinta con la superficie de color pleno. Sólo una por fila: marca
 * cuál de los cuatro números manda.
 */

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

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

interface StatCardProps {
  readonly label: string;
  /** Valor en bruto. La tarjeta lo anima; `format` decide cómo se escribe. */
  readonly value: number;
  readonly format: (value: number) => string;
  readonly delta: MetricDelta;
  /** Cómo escribir la diferencia absoluta cuando no hay porcentaje. */
  readonly formatAbsolute?: (value: number) => string;
  /** Si un aumento en esta métrica es una buena noticia. */
  readonly higherIsBetter: boolean;
  /** Contra qué se compara: "vs. semana anterior". */
  readonly comparison: string;
  readonly hero?: boolean;
  readonly onSelect: () => void;
  /** Qué anuncia el botón que hace: "Ver los incidentes sin resolver". */
  readonly actionLabel: string;
}

export function StatCard({
  label,
  value,
  format,
  delta,
  formatAbsolute = formatSignedNumber,
  higherIsBetter,
  comparison,
  hero = false,
  onSelect,
  actionLabel,
}: StatCardProps) {
  const animated = useCountUp(value);

  // Con base cero no hay porcentaje que mostrar, pero sí una diferencia real.
  const formattedDelta =
    delta.percent === null ? formatAbsolute(delta.absolute) : formatDelta(delta.percent);

  // El sentido del cambio sale del porcentaje si existe y del absoluto si no.
  const direction = Math.sign(Math.round(delta.percent ?? delta.absolute));
  const tone: DeltaTone =
    direction === 0 ? 'neutral' : direction > 0 === higherIsBetter ? 'good' : 'bad';
  const DeltaIcon = direction === 0 ? Minus : direction > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <article
      className={cn(
        'group relative flex min-h-34 flex-col rounded-card p-4 transition-[transform,box-shadow] duration-200 ease-out-soft hover:-translate-y-0.5',
        hero ? 'surface-hero' : 'bg-surface-card shadow-card hover:shadow-lift',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className={cn('text-sm leading-snug font-medium', !hero && 'text-text-primary')}>
          {label}
        </h3>
        <span
          aria-hidden="true"
          className={cn(
            'grid size-8 shrink-0 place-items-center rounded-pill border transition-transform duration-200 ease-out-soft group-hover:rotate-45',
            hero
              ? 'border-transparent bg-white text-brand-800'
              : 'border-border-strong text-text-primary',
          )}
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>

      <p className="tabular mt-auto pt-2 text-[2.5rem] leading-none font-semibold tracking-tight">
        {format(animated)}
      </p>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
        {/* La cifra y su flecha no se separan nunca: partidas en dos líneas se
            leerían como dos datos distintos. */}
        <span
          className={cn(
            'tabular inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 leading-none font-semibold whitespace-nowrap',
            hero ? 'border-white/30 text-white' : cn('border-border-subtle', TONE_CLASSES[tone]),
          )}
        >
          <DeltaIcon aria-hidden="true" className="size-3 shrink-0" />
          {formattedDelta}
        </span>
        <span className={hero ? 'text-white/75' : 'text-text-muted'}>{comparison}</span>
      </p>

      <button
        type="button"
        onClick={onSelect}
        aria-label={actionLabel}
        title={actionLabel}
        className={cn('absolute inset-0 rounded-card', hero && 'focus-visible:outline-white')}
      />
    </article>
  );
}
