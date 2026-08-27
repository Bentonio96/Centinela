/**
 * Incidentes detectados por día en los últimos 30 días.
 *
 * Dos series: el total y el subconjunto de críticos. El total solo diría
 * cuánto ruido hubo; superponer los críticos muestra si ese ruido importaba.
 *
 * Son áreas y no líneas sueltas porque los críticos son *parte* del total, no
 * una magnitud paralela: dibujar la banda de críticos dentro de la del total
 * hace visible la proporción, que es la pregunta real ("de todo lo que entró,
 * cuánto era grave"). El relleno se desvanece hacia abajo para que dos áreas
 * superpuestas no se conviertan en un bloque opaco.
 *
 * Al hacer clic en un día, ese día pasa a filtrar la tabla y queda marcado con
 * una línea de referencia; volver a pulsarlo lo quita. El gráfico emite el
 * filtro y nunca lo recibe: los indicadores siguen describiendo los 30 días.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
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
  const reducedMotion = usePrefersReducedMotion();

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

  const activePoint =
    activeDay === null ? undefined : data.find((point) => point.date === activeDay);

  return (
    <ChartCard
      title="Incidentes por día"
      description="Detecciones diarias de los últimos 30 días"
      legend={LEGEND}
      height={248}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={[...data]}
          margin={{ top: 4, right: 12, bottom: 0, left: -18 }}
          // Recharts hace el gráfico tabulable para poder recorrerlo con las
          // flechas; sin nombre anunciaría la concatenación de los ejes.
          aria-label="Gráfico de área: incidentes detectados por día en los últimos 30 días. Pulse un día para filtrar la tabla."
          onClick={handleChartClick}
          className="cursor-pointer"
        >
          <defs>
            {/* Los `stop` llevan el color en `style` y no como atributo: una
                variable CSS en un atributo de presentación depende de que el
                navegador lo trate como declaración, y en una propiedad de
                estilo la sustitución está garantizada. */}
            <linearGradient id="area-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: TOTAL_COLOR, stopOpacity: 0.38 }} />
              <stop offset="100%" style={{ stopColor: TOTAL_COLOR, stopOpacity: 0.02 }} />
            </linearGradient>
            <linearGradient id="area-critical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: CRITICAL_COLOR, stopOpacity: 0.45 }} />
              <stop offset="100%" style={{ stopColor: CRITICAL_COLOR, stopOpacity: 0.04 }} />
            </linearGradient>
          </defs>

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
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
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
          <Area
            type="monotone"
            dataKey="total"
            name="Total"
            stroke={TOTAL_COLOR}
            strokeWidth={2}
            fill="url(#area-total)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            isAnimationActive={!reducedMotion}
            animationDuration={850}
            animationEasing="ease-out"
          />
          {/* Se dibuja después para quedar por encima: es el subconjunto. */}
          <Area
            type="monotone"
            dataKey="critical"
            name="Críticos"
            stroke={CRITICAL_COLOR}
            strokeWidth={2}
            fill="url(#area-critical)"
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 0 }}
            isAnimationActive={!reducedMotion}
            animationDuration={850}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
