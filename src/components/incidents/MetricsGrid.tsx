/**
 * Fila de indicadores del encabezado.
 *
 * Traduce `DashboardMetrics` a cuatro tarjetas y es el único lugar que sabe
 * qué dirección es "buena" para cada métrica.
 */

import { AlertTriangle, CircleCheck, Clock, ShieldAlert } from 'lucide-react';

import { formatDurationFromHours, formatNumber, formatSignedDuration } from '@/lib/format';
import type { DashboardMetrics } from '@/types';
import { MetricCard } from './MetricCard';

interface MetricsGridProps {
  readonly metrics: DashboardMetrics;
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <section aria-labelledby="metricas-titulo">
      <h2 id="metricas-titulo" className="sr-only">
        Indicadores generales
      </h2>

      <div className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Incidentes abiertos"
          value={formatNumber(metrics.openIncidents)}
          delta={metrics.deltas.openIncidents}
          higherIsBetter={false}
          comparison="vs. semana anterior"
          icon={ShieldAlert}
          iconClassName="text-status-open"
        />
        <MetricCard
          label="Críticos sin resolver"
          value={formatNumber(metrics.criticalIncidents)}
          delta={metrics.deltas.criticalIncidents}
          higherIsBetter={false}
          comparison="vs. semana anterior"
          icon={AlertTriangle}
          iconClassName="text-severity-critical"
        />
        <MetricCard
          label="Tiempo medio de resolución"
          value={formatDurationFromHours(metrics.meanTimeToResolveHours)}
          delta={metrics.deltas.meanTimeToResolveHours}
          // La diferencia absoluta de esta métrica son horas, no incidentes.
          formatAbsolute={formatSignedDuration}
          higherIsBetter={false}
          comparison="vs. 30 días previos"
          icon={Clock}
          iconClassName="text-severity-medium"
        />
        <MetricCard
          label="Resueltos esta semana"
          value={formatNumber(metrics.resolvedThisWeek)}
          delta={metrics.deltas.resolvedThisWeek}
          higherIsBetter
          comparison="vs. semana anterior"
          icon={CircleCheck}
          iconClassName="text-status-resolved"
        />
      </div>
    </section>
  );
}
