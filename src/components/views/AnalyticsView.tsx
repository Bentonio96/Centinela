/**
 * Analítica: cómo viene resolviendo el equipo y de qué está hecho el volumen.
 *
 * Aquí la ventana la elige quien mira, y cada cifra se compara contra la
 * ventana inmediatamente anterior del mismo tamaño. Todo se recalcula al
 * cambiarla; no hay series precalculadas por rango.
 *
 * Todos los gráficos están dibujados a mano en SVG y CSS. Una librería de
 * gráficos pesaba más que la aplicación entera, y ninguno de estos necesita
 * más que arcos, rectángulos y una polilínea.
 */

import { ArrowDownRight, ArrowUpRight, Download, Minus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AreaCompare } from '@/components/charts/AreaCompare';
import { Donut, type DonutSlice } from '@/components/charts/Donut';
import { Heatmap } from '@/components/charts/Heatmap';
import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { PillGroup, type PillOption } from '@/components/ui/PillGroup';
import { Sparkline } from '@/components/ui/Sparkline';
import {
  buildAnalystRanking,
  buildCategoryShare,
  buildHeatmap,
  buildKpis,
  buildSeverityShare,
  buildThroughput,
  incidentsInRange,
  type Kpi,
  type RangeDays,
} from '@/lib/analytics';
import { CATEGORY_META, SEVERITY_META, WEEKDAY_LONG } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import {
  formatCompactDuration,
  formatDelta,
  formatDurationFromHours,
  formatNumber,
  formatPercent,
  formatSignedDuration,
  formatSignedNumber,
} from '@/lib/format';
import type { ViewProps } from '@/types/app';

const RANGE_OPTIONS: readonly PillOption<RangeDays>[] = [
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
];

/** Colores de las porciones del anillo, de la más grande a la más chica. */
const SLICE_COLORS = [
  'var(--series-1)',
  'var(--series-2)',
  'var(--series-3)',
  'var(--series-4)',
  'var(--series-5)',
] as const;
const OTHER_COLOR = 'var(--series-6)';

const SEVERITY_BAR_CLASS = {
  critical: 'bg-severity-critical-solid',
  high: 'bg-severity-high',
  medium: 'bg-severity-medium',
  low: 'bg-severity-low',
} as const;

interface KpiCardProps {
  readonly label: string;
  readonly kpi: Kpi;
  readonly format: (value: number) => string;
  /** Cómo escribir la variación. Recibe el `MetricDelta` entero. */
  readonly formatDelta: (kpi: Kpi) => string;
  readonly higherIsBetter: boolean;
  readonly comparison: string;
  readonly delay: number;
}

function KpiCard({
  label,
  kpi,
  format,
  formatDelta: describeDelta,
  higherIsBetter,
  comparison,
  delay,
}: KpiCardProps) {
  const direction = Math.sign(Math.round(kpi.delta.percent ?? kpi.delta.absolute));
  const isGood = direction > 0 === higherIsBetter;
  const DeltaIcon = direction === 0 ? Minus : direction > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      as="article"
      className="rise relative flex min-h-34 flex-col overflow-hidden"
      style={cssVars({ '--rise-delay': `${delay}ms` })}
    >
      <div className="px-4.5 pt-4">
        <h3 className="text-sm font-medium text-text-secondary">{label}</h3>
        <p className="tabular mt-1.5 text-[2rem] leading-none font-semibold tracking-tight">
          {format(kpi.value)}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span
            className={cn(
              'tabular inline-flex items-center gap-0.5 font-semibold whitespace-nowrap',
              direction === 0
                ? 'text-text-muted'
                : isGood
                  ? 'text-status-resolved'
                  : 'text-severity-critical',
            )}
          >
            <DeltaIcon aria-hidden="true" className="size-3.5 shrink-0" />
            {describeDelta(kpi)}
          </span>
          <span className="text-text-muted">{comparison}</span>
        </p>
      </div>
      {/* A sangre contra el borde inferior: la curva es un fondo, no un dato
          más de la retícula. */}
      <Sparkline values={kpi.series} color="var(--series-2)" className="mt-auto h-10" />
    </Card>
  );
}

export function AnalyticsView({ incidents, now, settings, actions, headingRef }: ViewProps) {
  const [range, setRange] = useState<RangeDays>(30);

  const kpis = useMemo(() => buildKpis(incidents, now, range), [incidents, now, range]);
  const throughput = useMemo(() => buildThroughput(incidents, now, range), [incidents, now, range]);
  const categories = useMemo(
    () => buildCategoryShare(incidents, now, range),
    [incidents, now, range],
  );
  const severities = useMemo(
    () => buildSeverityShare(incidents, now, range),
    [incidents, now, range],
  );
  const heatmap = useMemo(() => buildHeatmap(incidents, now, range), [incidents, now, range]);
  const ranking = useMemo(
    () => buildAnalystRanking(incidents, now, range),
    [incidents, now, range],
  );

  const comparison = `vs. ${range} días previos`;
  const totalDetected = categories.reduce((sum, entry) => sum + entry.total, 0);

  // Las cinco categorías más grandes y el resto agrupado: ocho porciones en
  // un anillo de este tamaño dejan tres ilegibles.
  const slices = useMemo<readonly DonutSlice[]>(() => {
    const top = categories.slice(0, SLICE_COLORS.length).map((entry, index) => ({
      key: entry.category,
      label: CATEGORY_META[entry.category].label,
      value: entry.total,
      color: SLICE_COLORS[index] ?? OTHER_COLOR,
    }));
    const rest = categories.slice(SLICE_COLORS.length).reduce((sum, entry) => sum + entry.total, 0);

    return rest > 0
      ? [...top, { key: 'otras', label: 'Otras', value: rest, color: OTHER_COLOR }]
      : top;
  }, [categories]);

  const maxResolved = Math.max(1, ...ranking.map((entry) => entry.resolved));
  const peakText =
    heatmap.peak === null
      ? 'Sin incidentes en el período.'
      : `La franja más cargada es el ${WEEKDAY_LONG[heatmap.peak.weekday] ?? ''} a las ${String(heatmap.peak.hour).padStart(2, '0')}:00.`;

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Analítica"
        description="Cómo viene resolviendo el equipo, y de qué está hecho el volumen."
        actions={
          <>
            <PillGroup
              label="Período observado"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
            />
            <Button
              onClick={() =>
                actions.exportCsv(incidentsInRange(incidents, now, range), `${range}-dias`)
              }
            >
              <Download aria-hidden="true" className="size-4" />
              Exportar CSV
            </Button>
          </>
        }
      />

      <section aria-labelledby="kpis-titulo">
        <h2 id="kpis-titulo" className="sr-only">
          Indicadores del período
        </h2>
        <div className="grid grid-cols-2 gap-gutter-sm xl:grid-cols-4">
          <KpiCard
            label="Detectados"
            kpi={kpis.detected}
            format={formatNumber}
            formatDelta={({ delta }) =>
              delta.percent === null
                ? formatSignedNumber(delta.absolute)
                : formatDelta(delta.percent)
            }
            higherIsBetter={false}
            comparison={comparison}
            delay={0}
          />
          <KpiCard
            label="Resueltos"
            kpi={kpis.resolved}
            format={formatNumber}
            formatDelta={({ delta }) =>
              delta.percent === null
                ? formatSignedNumber(delta.absolute)
                : formatDelta(delta.percent)
            }
            higherIsBetter
            comparison={comparison}
            delay={60}
          />
          <KpiCard
            label="Tiempo medio de resolución"
            kpi={kpis.meanTimeToResolve}
            format={formatDurationFromHours}
            formatDelta={({ delta }) =>
              delta.percent === null
                ? formatSignedDuration(delta.absolute)
                : formatDelta(delta.percent)
            }
            higherIsBetter={false}
            comparison={comparison}
            delay={120}
          />
          <KpiCard
            label="Cierres dentro de plazo"
            kpi={kpis.slaCompliance}
            format={formatPercent}
            // En puntos porcentuales, no en porcentaje de un porcentaje.
            formatDelta={({ delta }) => {
              const points = Math.round(delta.absolute);
              return points === 0
                ? 'sin cambios'
                : `${points > 0 ? '+' : '−'}${Math.abs(points)} pts`;
            }}
            higherIsBetter
            comparison={comparison}
            delay={180}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter-sm xl:grid-cols-12">
        <Card
          as="section"
          aria-labelledby="detecciones-titulo"
          className="rise xl:col-span-8"
          style={cssVars({ '--rise-delay': '240ms' })}
        >
          <CardHeader>
            <div>
              <CardTitle id="detecciones-titulo">Detecciones por día</CardTitle>
              <CardDescription>
                Incidentes detectados cada día, contra los mismos días del período anterior.
              </CardDescription>
            </div>
            <ul aria-hidden="true" className="flex items-center gap-4 text-xs text-text-secondary">
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 rounded-pill bg-series-2" />
                Este período
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-dotted border-text-muted" />
                Anterior
              </li>
            </ul>
          </CardHeader>
          <div className="px-3 pt-3 pb-3">
            <AreaCompare
              // La clave reinicia la animación de trazado al cambiar de rango.
              key={range}
              points={throughput}
              label={`Detecciones por día en los últimos ${range} días: ${kpis.detected.value} en total, contra el período anterior`}
            />
          </div>
        </Card>

        <Card
          as="section"
          aria-labelledby="categorias-titulo"
          className="rise flex flex-col xl:col-span-4"
          style={cssVars({ '--rise-delay': '300ms' })}
        >
          <CardHeader>
            <CardTitle id="categorias-titulo">Por categoría</CardTitle>
          </CardHeader>
          <div className="flex flex-1 flex-col items-center gap-4 px-4.5 pt-3 pb-4 sm:flex-row xl:flex-col">
            <Donut
              slices={slices}
              label={`Reparto de ${totalDetected} incidentes por categoría`}
              className="w-40 shrink-0"
            >
              <p className="tabular text-2xl leading-none font-semibold tracking-tight">
                {formatNumber(totalDetected)}
              </p>
              <p className="mt-1 text-[0.6875rem] text-text-muted">incidentes</p>
            </Donut>

            <ul className="flex w-full flex-col gap-2">
              {slices.map((slice) => (
                <li key={slice.key} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-pill"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-text-secondary">{slice.label}</span>
                  <span className="tabular font-semibold text-text-primary">{slice.value}</span>
                  <span className="tabular w-10 text-right text-xs text-text-muted">
                    {formatPercent(totalDetected === 0 ? 0 : slice.value / totalDetected)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="flex flex-col gap-gutter-sm xl:col-span-7">
          <Card
            as="section"
            aria-labelledby="calor-titulo"
            className="rise"
            style={cssVars({ '--rise-delay': '360ms' })}
          >
            <CardHeader>
              <div>
                <CardTitle id="calor-titulo">Cuándo llegan</CardTitle>
                <CardDescription>
                  Detecciones por día de la semana y hora. {peakText}
                </CardDescription>
              </div>
            </CardHeader>
            <div className="px-4.5 pt-4 pb-4">
              <Heatmap
                data={heatmap}
                weekStart={settings.weekStart}
                label={`Mapa de calor de detecciones por día de la semana y hora del día. ${peakText}`}
              />
            </div>
          </Card>

          <Card
            as="section"
            aria-labelledby="severidad-titulo"
            className="rise"
            style={cssVars({ '--rise-delay': '420ms' })}
          >
            <CardHeader>
              <CardTitle id="severidad-titulo">Por severidad</CardTitle>
            </CardHeader>
            <div className="px-4.5 pt-3 pb-4">
              <div aria-hidden="true" className="flex h-3 gap-0.5 overflow-hidden rounded-pill">
                {severities.map((entry) =>
                  entry.total === 0 ? null : (
                    <span
                      key={entry.severity}
                      className={cn('grow-x', SEVERITY_BAR_CLASS[entry.severity])}
                      style={{ width: `${entry.share * 100}%` }}
                    />
                  ),
                )}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                {severities.map((entry) => (
                  <li key={entry.severity} className="flex items-center gap-1.5 text-sm">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2 shrink-0 rounded-pill',
                        SEVERITY_BAR_CLASS[entry.severity],
                      )}
                    />
                    <span className="text-text-secondary">
                      {SEVERITY_META[entry.severity].label}
                    </span>
                    <span className="tabular ml-auto font-semibold text-text-primary">
                      {entry.total}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <Card
          as="section"
          aria-labelledby="ranking-titulo"
          className="rise xl:col-span-5"
          style={cssVars({ '--rise-delay': '480ms' })}
        >
          <CardHeader>
            <div>
              <CardTitle id="ranking-titulo">Quién resuelve</CardTitle>
              <CardDescription>Casos cerrados y tiempo medio por analista.</CardDescription>
            </div>
          </CardHeader>
          <ol className="flex flex-col gap-3 px-4.5 pt-3.5 pb-4">
            {ranking.slice(0, 5).map((entry) => (
              <li key={entry.analyst.name} className="flex items-center gap-3">
                <Avatar name={entry.analyst.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {entry.analyst.name}
                    </p>
                    <p className="tabular shrink-0 text-xs text-text-muted">
                      <span className="font-semibold text-text-primary">{entry.resolved}</span>
                      {entry.meanHours !== null && (
                        <> · {formatCompactDuration(entry.meanHours)} de media</>
                      )}
                    </p>
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-sunken"
                  >
                    <div
                      className="grow-x h-full rounded-pill bg-series-2"
                      style={{ width: `${(entry.resolved / maxResolved) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
