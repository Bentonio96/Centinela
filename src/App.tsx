/**
 * Composición del dashboard.
 *
 * El componente no calcula nada por su cuenta: reúne la fuente de datos
 * (`useLiveFeed`), el estado de la vista (`useIncidents`), las series derivadas
 * (`lib/metrics`) y los bloques que las pintan. Toda la lógica vive en hooks y
 * funciones puras, que es lo que hace posible probarlas sin montar la
 * aplicación.
 */

import { useMemo } from 'react';

import { IncidentsByCategoryChart } from '@/components/charts/IncidentsByCategoryChart';
import { IncidentsTrendChart } from '@/components/charts/IncidentsTrendChart';
import { IncidentDetailPanel } from '@/components/incidents/IncidentDetailPanel';
import { IncidentsPanel } from '@/components/incidents/IncidentsPanel';
import { MetricsGrid } from '@/components/incidents/MetricsGrid';
import { AppHeader } from '@/components/layout/AppHeader';
import { useIncidents } from '@/hooks/useIncidents';
import { useLiveFeed } from '@/hooks/useLiveFeed';
import { useTheme } from '@/hooks/useTheme';
import { formatDateTime } from '@/lib/format';
import { buildCategorySeries, buildTrendSeries, computeMetrics } from '@/lib/metrics';

export default function App() {
  const { theme, toggleTheme } = useTheme();

  // Con el flujo detenido esto es el dataset determinista de siempre; activo,
  // la misma lista con los incidentes que van entrando al principio.
  const feed = useLiveFeed();
  const { incidents, now } = feed;

  const state = useIncidents(incidents);

  const metrics = useMemo(() => computeMetrics(incidents, now), [incidents, now]);
  const trend = useMemo(() => buildTrendSeries(incidents, now), [incidents, now]);
  const categories = useMemo(() => buildCategorySeries(incidents, now), [incidents, now]);

  return (
    <div className="min-h-dvh bg-surface-base">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-contrast"
      >
        Saltar al contenido
      </a>

      <AppHeader
        theme={theme}
        onToggleTheme={toggleTheme}
        updatedAt={formatDateTime(new Date(now).toISOString())}
        live={feed.running}
        onToggleLive={feed.toggle}
      />

      <main
        id="contenido"
        className="mx-auto flex max-w-[1600px] flex-col gap-gutter-sm px-gutter-sm py-gutter-sm lg:px-gutter lg:py-gutter"
      >
        <MetricsGrid metrics={metrics} />

        <div className="grid gap-gutter-sm lg:grid-cols-2">
          <IncidentsTrendChart data={trend} activeDay={state.day} onSelectDay={state.selectDay} />
          <IncidentsByCategoryChart
            data={categories}
            activeCategory={state.category}
            onSelectCategory={state.selectCategory}
          />
        </div>

        <IncidentsPanel state={state} recentIds={feed.recentIds} />
      </main>

      <IncidentDetailPanel incident={state.selectedIncident} onClose={state.closeIncident} />
    </div>
  );
}
