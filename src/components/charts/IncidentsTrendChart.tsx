/**
 * Incidentes detectados por día en los últimos 30 días.
 *
 * Dos series: el total y el subconjunto de críticos. El total solo diría
 * cuánto ruido hubo; superponer los críticos muestra si ese ruido importaba.
 *
 * Al hacer clic en un día, ese día pasa a filtrar la tabla y queda marcado con
 * una línea de referencia; volver a pulsarlo lo quita. El gráfico emite el
 * filtro y nunca lo recibe: los indicadores siguen describiendo los 30 días.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { SEVERITY_META } from '@/lib/catalog';
import type { TrendPoint } from '@/types';
import { ChartCard, type ChartSeriesLegend } from './ChartCard';
import { ChartTooltip } from './ChartTooltip';

const TOTAL_COLOR = 'var(--accent)';
const CRITICAL_COLOR = SEVERITY_META.critical.chartColor;

const LEGEND: readonly ChartSeriesLegend[] = [
  { label: 'Total', color: TOTAL_COLOR },
  { label: 'Críticos', color: CRITICAL_COLOR },
];

const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 11 } as const;

interface IncidentsTrendChartProps {
  readonly data: readonly TrendPoint[];
  /** Día que ya está filtrando, en formato `YYYY-MM-DD`. */
  readonly activeDay: string | null;
  readonly onSelectDay: (day: string | null) => void;
}

export function IncidentsTrendChart({ data, activeDay, onSelectDay }: IncidentsTrendChartProps) {
  /**
   * Recharts entrega el índice del punto bajo el cursor. Resolver la fecha
   * desde el array propio evita depender de la forma de su payload interno.
   *
   * El índice llega como `number | string | null`, así que se normaliza y se
   * descarta todo lo que no sea una posición válida.
   */
  const handleChartClick = (chartState: {
    // El `| undefined` explícito hace falta con `exactOptionalPropertyTypes`.
    readonly activeTooltipIndex?: number | string | null | undefined;
  }) => {
    const raw = chartState.activeTooltipIndex;
    if (raw === null || raw === undefined) return;

    const index = Number(raw);
    if (!Number.isInteger(index) || index < 0) return;

    const point = data[index];
    if (point === undefined) return;

    // Pulsar el día ya activo lo deselecciona.
    onSelectDay(point.date === activeDay ? null : point.date);
  };

  const activePoint = activeDay === null ? undefined : data.find((point) => point.date === activeDay);

  return (
    <ChartCard
      title="Incidentes por día"
      description="Detecciones diarias de los últimos 30 días"
      legend={LEGEND}
      height={248}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={[...data]}
          margin={{ top: 4, right: 12, bottom: 0, left: -18 }}
          // Recharts hace el gráfico tabulable para poder recorrerlo con las
          // flechas; sin nombre anunciaría la concatenación de los ejes.
          aria-label="Gráfico de línea: incidentes detectados por día en los últimos 30 días. Pulse un día para filtrar la tabla."
          onClick={handleChartClick}
          className="cursor-pointer"
        >
          {/* Sólo líneas horizontales: las verticales en 30 puntos serían una reja. */}
          <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            // Con 30 etiquetas se solaparían; se muestra una de cada cinco.
            interval={4}
            minTickGap={8}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
          />
          {activePoint !== undefined && (
            <ReferenceLine
              x={activePoint.label}
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          )}
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke={TOTAL_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
          <Line
            type="monotone"
            dataKey="critical"
            name="Críticos"
            stroke={CRITICAL_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
