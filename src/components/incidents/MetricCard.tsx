/**
 * Tarjeta de indicador: valor actual y su variación contra el período previo.
 *
 * Una variación no significa lo mismo en todas las métricas: que suban los
 * incidentes abiertos es malo, que suban los resueltos es bueno. Por eso el
 * signo no decide el color por sí solo — lo hace junto a `higherIsBetter`.
 */

import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { formatDelta, formatSignedNumber } from '@/lib/format';
import type { MetricDelta } from '@/types';

type DeltaTone = 'good' | 'bad' | 'neutral';

const TONE_CLASSES: Readonly<Record<DeltaTone, string>> = {
  good: 'text-status-resolved',
  bad: 'text-severity-critical',
  neutral: 'text-text-muted',
};

interface MetricCardProps {
  readonly label: string;
  /** Valor ya formateado: la tarjeta no decide cómo se escriben los números. */
  readonly value: string;
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
  /** Color del icono, para dar identidad a cada indicador. */
  readonly iconClassName?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  higherIsBetter,
  comparison,
  icon: Icon,
  iconClassName,
  formatAbsolute = formatSignedNumber,
}: MetricCardProps) {
  // Con base cero no hay porcentaje que mostrar, pero sí una diferencia real.
  const formattedDelta =
    delta.percent === null ? formatAbsolute(delta.absolute) : formatDelta(delta.percent);

  // El sentido del cambio sale del porcentaje si existe y del absoluto si no.
  const direction = Math.sign(Math.round(delta.percent ?? delta.absolute));

  const tone: DeltaTone =
    direction === 0 ? 'neutral' : direction > 0 === higherIsBetter ? 'good' : 'bad';

  const DeltaIcon = direction === 0 ? Minus : direction > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card as="article" className="px-gutter-sm py-3.5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xs font-medium tracking-wide text-text-muted uppercase">{label}</h3>
        <Icon aria-hidden="true" className={cn('size-4 shrink-0', iconClassName)} />
      </div>

      <p className="tabular mt-2 text-2xl leading-none font-semibold text-text-primary">{value}</p>

      <p className="mt-2.5 flex items-center gap-1 text-xs">
        <DeltaIcon aria-hidden="true" className={cn('size-3.5 shrink-0', TONE_CLASSES[tone])} />
        <span className={cn('tabular font-medium', TONE_CLASSES[tone])}>{formattedDelta}</span>
        <span className="text-text-muted">{comparison}</span>
      </p>
    </Card>
  );
}
