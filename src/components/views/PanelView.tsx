/**
 * Panel: el estado del turno en una pantalla, como un bento.
 *
 * Cada baldosa responde una pregunta distinta y ninguna repite a otra: cuánto
 * hay (indicadores), cómo viene la carga (barras), a quién le toca recibir
 * (traspaso), quién está con qué (equipo), si se cumplen los plazos (medidor)
 * y por dónde empezar (cola). El flujo en vivo es la única que no informa:
 * controla.
 *
 * Nada de aquí filtra en sitio. Todo lo accionable lleva a la tabla con el
 * recorte ya puesto o abre el detalle de un incidente; el panel es el índice,
 * no otra tabla.
 */

import { ArrowRight, ClipboardList, Download, Plus } from 'lucide-react';
import { useMemo } from 'react';

import { CapsuleBars } from '@/components/charts/CapsuleBars';
import { Gauge } from '@/components/charts/Gauge';
import { StatusPill } from '@/components/incidents/StatusPill';
import { PageHeader } from '@/components/layout/PageHeader';
import { LiveCard } from '@/components/panel/LiveCard';
import { StatCard } from '@/components/panel/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { incidentStore } from '@/data/store';
import { nextShift, shiftAt, shiftEndsAt, TEAM } from '@/data/team';
import type { FilterPreset } from '@/hooks/useIncidents';
import { useCountUp } from '@/hooks/useCountUp';
import { useNow } from '@/hooks/useNow';
import { CATEGORY_META, SHIFT_META, SLA_STATE_META, UNRESOLVED_STATUSES } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import {
  formatCompactDuration,
  formatDurationFromHours,
  formatNumber,
  formatSignedDuration,
  formatTime,
} from '@/lib/format';
import {
  buildLoadSeries,
  buildPriorityQueue,
  buildWorkloads,
  computeMetrics,
  TREND_DAYS,
} from '@/lib/metrics';
import { slaStatus, summarizeSla } from '@/lib/sla';
import type { LiveProps, ViewProps } from '@/types/app';
import type { Incident } from '@/types';

/** Todo lo que sigue siendo un problema. */
const OPEN_PRESET: FilterPreset = { statuses: UNRESOLVED_STATUSES };

/** Lo mismo, acotado a la severidad que obliga a levantar el teléfono. */
const CRITICAL_PRESET: FilterPreset = { severities: ['critical'], statuses: UNRESOLVED_STATUSES };

/** Lo ya cerrado. */
const RESOLVED_PRESET: FilterPreset = { statuses: ['resolved'] };

/** Filas de la cola prioritaria y del equipo: las que caben sin scroll. */
const QUEUE_SIZE = 4;
const ROSTER_SIZE = 4;

type PanelViewProps = ViewProps & LiveProps;

/** Cuánto falta —o cuánto se pasó— del plazo de un caso abierto. */
function describeDeadline(incident: Incident, now: number): string {
  const { targetHours, elapsedHours } = slaStatus(incident, now);
  const remaining = targetHours - elapsedHours;
  return remaining >= 0
    ? `Vence en ${formatCompactDuration(remaining)}`
    : `Vencido hace ${formatCompactDuration(-remaining)}`;
}

export function PanelView({ incidents, now, actions, running, live, headingRef }: PanelViewProps) {
  const metrics = useMemo(() => computeMetrics(incidents, now), [incidents, now]);
  const load = useMemo(() => buildLoadSeries(incidents, now), [incidents, now]);
  const queue = useMemo(() => buildPriorityQueue(incidents, now, QUEUE_SIZE), [incidents, now]);
  const sla = useMemo(() => summarizeSla(incidents, now, TREND_DAYS), [incidents, now]);

  // Primero quien está en turno, y dentro de eso quien tiene algo entre manos.
  const roster = useMemo(
    () =>
      buildWorkloads(incidents, now)
        .filter((entry) => entry.focus !== null)
        .sort((a, b) => Number(b.onShift) - Number(a.onShift) || b.open - a.open)
        .slice(0, ROSTER_SIZE),
    [incidents, now],
  );

  // El reloj de pared, no el de los datos: la cuenta atrás del traspaso tiene
  // que avanzar aunque no entre ningún incidente.
  const wallClock = useNow(60_000);
  const handoffAt = shiftEndsAt(new Date(wallClock));
  const incomingShift = nextShift(shiftAt(new Date(wallClock)));
  const receiver = TEAM.find((analyst) => analyst.shift === incomingShift);
  const hoursToHandoff = (handoffAt.getTime() - wallClock) / 3_600_000;

  const compliance = sla.total === 0 ? 0 : sla.met / sla.total;
  const animatedCompliance = useCountUp(Math.round(compliance * 100));

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Panel"
        description="El estado del turno, de un vistazo."
        actions={
          <>
            <Button variant="primary" onClick={actions.newIncident}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo incidente
            </Button>
            <Button onClick={() => actions.exportCsv(incidents, 'todos')}>
              <Download aria-hidden="true" className="size-4" />
              Exportar
            </Button>
          </>
        }
      />

      <section aria-labelledby="indicadores-titulo">
        <h2 id="indicadores-titulo" className="sr-only">
          Indicadores generales
        </h2>

        {/* Dos columnas ya desde el móvil: los cuatro valores son cortos y
            caben de sobra a 375px. */}
        <div className="grid grid-cols-2 gap-gutter-sm xl:grid-cols-4">
          <div className="rise" style={cssVars({ '--rise-delay': '0ms' })}>
            <StatCard
              hero
              label="Incidentes abiertos"
              value={metrics.openIncidents}
              format={formatNumber}
              delta={metrics.deltas.openIncidents}
              higherIsBetter={false}
              comparison="vs. semana anterior"
              onSelect={() => actions.showIncidents(OPEN_PRESET)}
              actionLabel="Ver los incidentes sin resolver"
            />
          </div>
          <div className="rise" style={cssVars({ '--rise-delay': '60ms' })}>
            <StatCard
              label="Críticos sin resolver"
              value={metrics.criticalIncidents}
              format={formatNumber}
              delta={metrics.deltas.criticalIncidents}
              higherIsBetter={false}
              comparison="vs. semana anterior"
              onSelect={() => actions.showIncidents(CRITICAL_PRESET)}
              actionLabel="Ver los incidentes críticos sin resolver"
            />
          </div>
          <div className="rise" style={cssVars({ '--rise-delay': '120ms' })}>
            <StatCard
              label="Resueltos esta semana"
              value={metrics.resolvedThisWeek}
              format={formatNumber}
              delta={metrics.deltas.resolvedThisWeek}
              higherIsBetter
              comparison="vs. semana anterior"
              onSelect={() => actions.showIncidents(RESOLVED_PRESET)}
              actionLabel="Ver los incidentes resueltos"
            />
          </div>
          <div className="rise" style={cssVars({ '--rise-delay': '180ms' })}>
            <StatCard
              label="Tiempo medio de resolución"
              value={metrics.meanTimeToResolveHours}
              format={formatDurationFromHours}
              delta={metrics.deltas.meanTimeToResolveHours}
              // La diferencia absoluta de esta métrica son horas, no incidentes.
              formatAbsolute={formatSignedDuration}
              higherIsBetter={false}
              comparison="vs. 30 días previos"
              // Es un promedio, no un conjunto de incidentes: su detalle
              // natural es la analítica, no un recorte de la tabla.
              onSelect={() => actions.navigate('analitica')}
              actionLabel="Ver la analítica de resolución"
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-gutter-sm xl:grid-cols-12">
        <div className="grid grid-cols-1 gap-gutter-sm md:grid-cols-9 xl:col-span-9">
          <Card
            as="section"
            aria-labelledby="carga-titulo"
            className="rise flex flex-col md:col-span-6"
            style={cssVars({ '--rise-delay': '240ms' })}
          >
            <CardHeader>
              <div>
                <CardTitle id="carga-titulo">Carga de la semana</CardTitle>
                <CardDescription>
                  Detecciones por día. Lo rayado es la proyección de las últimas cuatro semanas.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="mt-auto px-4.5 pt-3 pb-4">
              <CapsuleBars days={load} onSelectDay={(day) => actions.showIncidents({ day })} />
            </div>
          </Card>

          <Card
            as="section"
            aria-labelledby="traspaso-titulo"
            className="rise flex flex-col md:col-span-3"
            style={cssVars({ '--rise-delay': '300ms' })}
          >
            <CardHeader>
              <CardTitle id="traspaso-titulo">Próximo traspaso</CardTitle>
            </CardHeader>
            <div className="flex flex-1 flex-col px-4.5 pt-3 pb-4">
              <p className="text-[1.375rem] leading-tight font-semibold tracking-tight text-accent-text">
                {receiver === undefined
                  ? `Turno de ${SHIFT_META[incomingShift].label.toLowerCase()}`
                  : `Entrega a ${receiver.name}`}
              </p>
              <p className="tabular mt-2 text-xs text-text-muted">
                Turno de {SHIFT_META[incomingShift].label.toLowerCase()} · {formatTime(handoffAt)} ·
                en {formatCompactDuration(hoursToHandoff)}
              </p>
              <Button variant="primary" className="mt-auto w-full" onClick={actions.openHandoff}>
                <ClipboardList aria-hidden="true" className="size-4" />
                Preparar traspaso
              </Button>
            </div>
          </Card>

          <Card
            as="section"
            aria-labelledby="equipo-titulo"
            className="rise md:col-span-5"
            style={cssVars({ '--rise-delay': '360ms' })}
          >
            <CardHeader>
              <CardTitle id="equipo-titulo">Equipo en acción</CardTitle>
              <Button size="sm" onClick={() => actions.navigate('equipo')}>
                Ver equipo
              </Button>
            </CardHeader>
            <ul className="flex flex-col gap-0.5 px-2 pt-2 pb-2.5">
              {roster.map(({ analyst, focus, onShift }) =>
                focus === null ? null : (
                  <li key={analyst.name}>
                    <button
                      type="button"
                      onClick={() => actions.openIncident(focus)}
                      aria-label={`${analyst.name}, trabajando en ${focus.title}. Ver detalle`}
                      className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <Avatar name={analyst.name} size="sm" onShift={onShift} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {analyst.name}
                        </span>
                        <span className="block truncate text-xs text-text-muted">
                          Trabajando en{' '}
                          <span className="font-semibold text-text-secondary">{focus.title}</span>
                        </span>
                      </span>
                      <StatusPill status={focus.status} className="shrink-0" />
                    </button>
                  </li>
                ),
              )}
              {roster.length === 0 && (
                <li className="px-2.5 py-6 text-center text-sm text-text-muted">
                  Nadie tiene casos abiertos ahora mismo.
                </li>
              )}
            </ul>
          </Card>

          <Card
            as="section"
            aria-labelledby="sla-titulo"
            className="rise flex flex-col md:col-span-4"
            style={cssVars({ '--rise-delay': '420ms' })}
          >
            <CardHeader>
              <CardTitle id="sla-titulo">Cumplimiento de plazos</CardTitle>
            </CardHeader>
            <div className="flex flex-1 flex-col items-center justify-end px-4.5 pt-1 pb-4">
              <div className="relative w-full max-w-56">
                <Gauge
                  label={`De ${sla.total} incidentes de los últimos ${TREND_DAYS} días: ${sla.met} cerrados dentro de plazo, ${sla.running} en curso y ${sla.breached} con el plazo vencido.`}
                  className="w-full"
                  segments={[
                    { key: 'met', value: sla.met, color: 'var(--series-2)' },
                    { key: 'running', value: sla.running, color: 'var(--series-1)' },
                    { key: 'breached', value: sla.breached, color: '', hatched: true },
                  ]}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 bottom-1 text-center"
                >
                  <p className="tabular text-[2.25rem] leading-none font-semibold tracking-tight">
                    {Math.round(animatedCompliance)}%
                  </p>
                  <p className="mt-1 text-[0.6875rem] text-text-muted">dentro de plazo</p>
                </div>
              </div>

              <ul className="mt-3.5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-text-secondary">
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-pill bg-series-2" />
                  Cumplido
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2.5 rounded-pill bg-series-1" />
                  En curso
                </li>
                <li className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="hatch size-2.5 rounded-pill" />
                  Vencido
                </li>
              </ul>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-gutter-sm md:flex-row xl:col-span-3 xl:flex-col">
          <Card
            as="section"
            aria-labelledby="cola-titulo"
            className="rise flex min-w-0 flex-1 flex-col"
            style={cssVars({ '--rise-delay': '300ms' })}
          >
            <CardHeader>
              <CardTitle id="cola-titulo">Cola prioritaria</CardTitle>
              <Button size="sm" onClick={actions.newIncident}>
                <Plus aria-hidden="true" className="size-3.5" />
                Nuevo
              </Button>
            </CardHeader>

            <ul className="flex flex-col gap-0.5 px-2 pt-2">
              {queue.map((incident) => {
                const Icon = CATEGORY_META[incident.category].icon;
                const { state } = slaStatus(incident, now);
                const isCritical = incident.severity === 'critical';

                return (
                  <li key={incident.id}>
                    <button
                      type="button"
                      onClick={() => actions.openIncident(incident)}
                      aria-label={`Ver detalle de ${incident.id}: ${incident.title}`}
                      className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-[0.625rem]',
                          isCritical
                            ? 'bg-severity-critical-bg text-severity-critical'
                            : 'bg-accent-soft text-accent-text',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {incident.title}
                        </span>
                        <span
                          className={cn(
                            'block truncate text-xs',
                            state === 'on-track'
                              ? 'text-text-muted'
                              : SLA_STATE_META[state].textClassName,
                          )}
                        >
                          {describeDeadline(incident, now)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {queue.length === 0 && (
                <li className="px-2.5 py-8 text-center text-sm text-text-muted">
                  No queda ningún caso abierto.
                </li>
              )}
            </ul>

            <div className="mt-auto px-2 pt-1 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => actions.showIncidents(OPEN_PRESET)}
              >
                Ver todos los abiertos
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Button>
            </div>
          </Card>

          <div
            className="rise md:w-64 md:shrink-0 xl:w-auto"
            style={cssVars({ '--rise-delay': '480ms' })}
          >
            <LiveCard
              running={running}
              live={live}
              onToggle={incidentStore.toggleLive}
              onReset={incidentStore.resetLive}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
