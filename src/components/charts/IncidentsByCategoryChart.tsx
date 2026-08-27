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
 *
 * Las barras son accionables: al hacer clic, la categoría pasa a filtrar la
 * tabla. Eso es lo que convierte tres bloques sueltos en un tablero — se ve un
 * pico y se le puede preguntar qué lo causó. El flujo va sólo en esta
 * dirección: el gráfico emite el filtro y nunca lo recibe, así los indicadores
 * siguen describiendo los 30 días completos.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SEVERITY_META } from '@/lib/catalog';
import type { CategoryDatum, IncidentCategory } from '@/types';
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
  /** Categoría que ya está filtrando, para atenuar el resto de las barras. */
  readonly activeCategory: IncidentCategory | null;
  readonly onSelectCategory: (category: IncidentCategory | null) => void;
}

export function IncidentsByCategoryChart({
  data,
  activeCategory,
  onSelectCategory,
}: IncidentsByCategoryChartProps) {
  // El apilado necesita el complemento explícito; `total` es la suma de ambos.
  const chartData = data.map((datum) => ({
    shortLabel: datum.shortLabel,
    critical: datum.critical,
    rest: datum.total - datum.critical,
  }));

  const hasSelection = activeCategory !== null;

  /**
   * Recharts entrega el índice de la barra pulsada. Resolver la categoría desde
   * el array propio y no desde el payload de la librería mantiene el tipo del
   * dominio en lugar de tener que revalidar un `string`.
   */
  const handleBarClick = (_: unknown, index: number) => {
    const datum = data[index];
    if (datum === undefined) return;

    // Pulsar la barra ya activa la deselecciona.
    onSelectCategory(datum.category === activeCategory ? null : datum.category);
  };

  /** Opacidad de cada barra: con un filtro activo, lo no seleccionado se atenúa. */
  const opacityFor = (index: number) => {
    if (!hasSelection) return 1;
    const datum = data[index];
    return datum !== undefined && datum.category === activeCategory ? 1 : 0.3;
  };

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
          aria-label="Gráfico de barras: incidentes por categoría en los últimos 30 días. Pulse una barra para filtrar la tabla."
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
            onClick={handleBarClick}
            className="cursor-pointer"
          >
            {chartData.map((datum, index) => (
              <Cell key={datum.shortLabel} fillOpacity={opacityFor(index)} />
            ))}
          </Bar>
          <Bar
            dataKey="rest"
            name="Otras severidades"
            stackId="severidad"
            fill={REST_COLOR}
            radius={[0, 3, 3, 0]}
            onClick={handleBarClick}
            className="cursor-pointer"
          >
            {chartData.map((datum, index) => (
              <Cell key={datum.shortLabel} fillOpacity={opacityFor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
