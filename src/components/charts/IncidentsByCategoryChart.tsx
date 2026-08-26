/**
 * Incidentes por categoría de amenaza en los últimos 30 días.
 *
 * Barras horizontales: los nombres de categoría en español ("Acceso no
 * autorizado", "Ingeniería social") no caben bajo un eje X sin rotarlos, y una
 * etiqueta rotada es una etiqueta que nadie lee. El eje usa la forma corta y
 * el tooltip la completa, así ninguna etiqueta se parte en dos líneas.
 *
 * Cada barra está apilada en dos segmentos, críticos y el resto, por la misma
 * razón que el gráfico de línea separa las series: el volumen por sí solo no
 * dice si una categoría es un problema o sólo es ruidosa.
 */

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { SEVERITY_META } from '@/lib/catalog';
import type { CategoryDatum } from '@/types';
import { ChartCard, type ChartSeriesLegend } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

const CRITICAL_COLOR = SEVERITY_META.critical.chartColor;
const REST_COLOR = 'var(--accent)';

const LEGEND: readonly ChartSeriesLegend[] = [
  { label: 'Críticos', color: CRITICAL_COLOR },
  { label: 'Otras severidades', color: REST_COLOR },
];

const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 11 } as const;

interface IncidentsByCategoryChartProps {
  readonly data: readonly CategoryDatum[];
}

export function IncidentsByCategoryChart({ data }: IncidentsByCategoryChartProps) {
  // El apilado necesita el complemento explícito; `total` es la suma de ambos.
  const chartData = data.map((datum) => ({
    shortLabel: datum.shortLabel,
    critical: datum.critical,
    rest: datum.total - datum.critical,
  }));

  // El tooltip recibe la etiqueta del eje, que es la corta; aquí recupera la completa.
  const fullLabels = new Map(data.map((datum) => [datum.shortLabel, datum.label]));

  return (
    <ChartCard
      title="Incidentes por categoría"
      description="Distribución de los últimos 30 días"
      legend={LEGEND}
      height={296}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          // Recharts hace el gráfico tabulable para poder recorrerlo con las
          // flechas; sin nombre anunciaría la concatenación de los ejes.
          aria-label="Gráfico de barras: incidentes por categoría en los últimos 30 días"
          margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis
            type="number"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="shortLabel"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={86}
          />
          <Tooltip
            content={<ChartTooltip titleFormatter={(label) => fullLabels.get(String(label)) ?? String(label)} />}
            cursor={{ fill: 'var(--surface-hover)' }}
          />
          <Bar
            dataKey="critical"
            name="Críticos"
            stackId="severidad"
            fill={CRITICAL_COLOR}
            radius={[3, 0, 0, 3]}
          />
          <Bar
            dataKey="rest"
            name="Otras severidades"
            stackId="severidad"
            fill={REST_COLOR}
            radius={[0, 3, 3, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
