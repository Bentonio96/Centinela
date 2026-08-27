/**
 * Fila de indicadores del encabezado.
 *
 * Traduce `DashboardMetrics` a cuatro tarjetas y es el único lugar que sabe dos
 * cosas: qué dirección es "buena" para cada métrica, y a qué recorte de la
 * tabla lleva pulsarla.
 *
 * Los conjuntos de filtros se declaran como constantes del módulo y no se
 * construyen al vuelo dentro del render, porque `isPresetActive` los compara
 * por valor en cada pintado y no tiene sentido crear cuatro objetos nuevos
 * cada vez.
 */

import { AlertTriangle, CircleCheck, Clock, ShieldAlert } from 'lucide-react';

import type { FilterPreset } from '@/hooks/useIncidents';
import { UNRESOLVED_STATUSES } from '@/lib/catalog';
import { cssVars } from '@/lib/cssVars';
import { formatDurationFromHours, formatNumber, formatSignedDuration } from '@/lib/format';
import type { DashboardMetrics, MetricSparklines } from '@/types';
import { MetricCard } from './MetricCard';

/** Todo lo que sigue siendo un problema. */
const OPEN_PRESET: FilterPreset = { statuses: UNRESOLVED_STATUSES };

/** Lo mismo, acotado a la severidad que obliga a levantar el teléfono. */
const CRITICAL_PRESET: FilterPreset = {
  severities: ['critical'],
  statuses: UNRESOLVED_STATUSES,
};

/** Lo ya cerrado. */
const RESOLVED_PRESET: FilterPreset = { statuses: ['resolved'] };

interface MetricsGridProps {
  readonly metrics: DashboardMetrics;
  readonly sparklines: MetricSparklines;
  readonly applyPreset: (preset: FilterPreset) => void;
  readonly isPresetActive: (preset: FilterPreset) => boolean;
}

export function MetricsGrid({
  metrics,
  sparklines,
  applyPreset,
  isPresetActive,
}: MetricsGridProps) {
  return (
    <section aria-labelledby="metricas-titulo">
      <h2 id="metricas-titulo" className="sr-only">
        Indicadores generales
      </h2>

      {/* Dos columnas ya desde el móvil: los cuatro valores son cortos y caben
          de sobra a 375px. A una columna había que pasar cuatro tarjetas
          enteras antes de llegar a cualquier otra cosa. */}
      <div className="grid grid-cols-2 gap-gutter-sm xl:grid-cols-4">
        <div className="rise" style={cssVars({ '--rise-delay': '0ms' })}>
          <MetricCard
            label="Incidentes abiertos"
            value={metrics.openIncidents}
            format={formatNumber}
            delta={metrics.deltas.openIncidents}
            series={sparklines.openIncidents}
            higherIsBetter={false}
            comparison="vs. semana anterior"
            icon={ShieldAlert}
            tone="open"
            onSelect={() => applyPreset(OPEN_PRESET)}
            active={isPresetActive(OPEN_PRESET)}
            actionLabel="Filtrar la tabla por incidentes sin resolver"
          />
        </div>

        <div className="rise" style={cssVars({ '--rise-delay': '70ms' })}>
          <MetricCard
            label="Críticos sin resolver"
            value={metrics.criticalIncidents}
            format={formatNumber}
            delta={metrics.deltas.criticalIncidents}
            series={sparklines.criticalIncidents}
            higherIsBetter={false}
            comparison="vs. semana anterior"
            icon={AlertTriangle}
            tone="critical"
            onSelect={() => applyPreset(CRITICAL_PRESET)}
            active={isPresetActive(CRITICAL_PRESET)}
            actionLabel="Filtrar la tabla por incidentes críticos sin resolver"
          />
        </div>

        <div className="rise" style={cssVars({ '--rise-delay': '140ms' })}>
          <MetricCard
            label="Tiempo medio de resolución"
            value={metrics.meanTimeToResolveHours}
            format={formatDurationFromHours}
            delta={metrics.deltas.meanTimeToResolveHours}
            series={sparklines.meanTimeToResolveHours}
            // La diferencia absoluta de esta métrica son horas, no incidentes.
            formatAbsolute={formatSignedDuration}
            higherIsBetter={false}
            comparison="vs. 30 días previos"
            icon={Clock}
            tone="duration"
          />
        </div>

        <div className="rise" style={cssVars({ '--rise-delay': '210ms' })}>
          <MetricCard
            label="Resueltos esta semana"
            value={metrics.resolvedThisWeek}
            format={formatNumber}
            delta={metrics.deltas.resolvedThisWeek}
            series={sparklines.resolvedThisWeek}
            higherIsBetter
            comparison="vs. semana anterior"
            icon={CircleCheck}
            tone="resolved"
            onSelect={() => applyPreset(RESOLVED_PRESET)}
            active={isPresetActive(RESOLVED_PRESET)}
            actionLabel="Filtrar la tabla por incidentes resueltos"
          />
        </div>
      </div>
    </section>
  );
}
