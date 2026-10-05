/**
 * Mapa de calor de día de la semana contra hora del día.
 *
 * Es una rejilla CSS de celdas cuadradas, no un SVG: 168 rectángulos iguales
 * los coloca mejor `grid` que una cuenta de coordenadas, y se adaptan solos al
 * ancho disponible.
 *
 * La intensidad se resuelve en cinco escalones y no en un degradado continuo.
 * Con valores que van de 0 a 6, un continuo pintaría seis verdes casi iguales
 * que nadie distingue; cinco escalones se leen como "nada, poco, algo,
 * bastante, mucho".
 */

import type { WeekStart } from '@/data/settings';
import { WEEKDAY_LONG } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import type { Heatmap as HeatmapData } from '@/lib/analytics';

/** Con lunes = 0, igual que las filas que entrega `buildHeatmap`. */
const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const LEVELS = 4;

/** Mezcla del tono de la serie sobre la superficie, por escalón. */
const LEVEL_MIX = [0, 28, 52, 76, 100] as const;

function levelOf(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(1, Math.ceil((value / max) * LEVELS));
}

function cellColor(level: number): string {
  const mix = LEVEL_MIX[level] ?? 0;
  return mix === 0
    ? 'var(--surface-sunken)'
    : `color-mix(in oklab, var(--series-2) ${mix}%, var(--surface-sunken))`;
}

interface HeatmapProps {
  readonly data: HeatmapData;
  readonly weekStart: WeekStart;
  /** Resumen en texto de lo que muestra, para lectores de pantalla. */
  readonly label: string;
}

export function Heatmap({ data, weekStart, label }: HeatmapProps) {
  const rowOrder = weekStart === 'monday' ? [0, 1, 2, 3, 4, 5, 6] : [6, 0, 1, 2, 3, 4, 5];

  return (
    <div>
      <div
        role="img"
        aria-label={label}
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: '2.25rem repeat(24, minmax(0, 1fr))' }}
      >
        {rowOrder.map((weekday) => (
          <div key={weekday} className="contents">
            <span className="self-center text-[0.6875rem] text-text-muted">
              {WEEKDAY_SHORT[weekday]}
            </span>
            {HOURS.map((hour) => {
              const value = data.cells[weekday]?.[hour] ?? 0;
              return (
                <span
                  key={hour}
                  title={`${WEEKDAY_LONG[weekday] ?? ''}, ${String(hour).padStart(2, '0')}:00 — ${value} ${value === 1 ? 'incidente' : 'incidentes'}`}
                  className="aspect-square rounded-[3px] sm:rounded-[5px]"
                  style={{ backgroundColor: cellColor(levelOf(value, data.max)) }}
                />
              );
            })}
          </div>
        ))}

        {/* Eje de horas: una etiqueta cada tres para que quepan a 375px. */}
        <span aria-hidden="true" />
        {HOURS.map((hour) => (
          <span
            key={hour}
            aria-hidden="true"
            className={cn(
              'tabular mt-0.5 text-[0.625rem] leading-none text-text-muted',
              hour % 3 !== 0 && 'invisible',
            )}
          >
            {String(hour).padStart(2, '0')}
          </span>
        ))}
      </div>

      <div
        aria-hidden="true"
        className="mt-3 flex items-center justify-end gap-1.5 text-[0.6875rem] text-text-muted"
      >
        Menos
        {LEVEL_MIX.map((_, level) => (
          <span
            key={level}
            className="size-3 rounded-[3px]"
            style={{ backgroundColor: cellColor(level) }}
          />
        ))}
        Más
      </div>
    </div>
  );
}
