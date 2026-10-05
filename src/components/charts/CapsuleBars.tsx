/**
 * Barras en cápsula: la carga de los últimos días y la proyección de los
 * próximos.
 *
 * Son `div` con altura porcentual, no SVG: siete rectángulos redondeados no
 * necesitan un sistema de coordenadas, y así cada barra real puede ser un
 * `<button>` de verdad que filtra la tabla por ese día.
 *
 * Tres tonos sólidos y un rayado, cada uno con un solo significado: el día de
 * hoy (claro), el pico del período (oscuro), el resto (medio) y lo que todavía
 * es una proyección (rayado). El rayado se distingue por forma y no sólo por
 * color, así que sobrevive a una impresión en grises.
 */

import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import { formatLongDay } from '@/lib/format';
import type { LoadDay } from '@/lib/metrics';

/** Iniciales de los días, indexadas como `Date.getDay()`: 0 = domingo. */
const WEEKDAY_INITIAL = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const;

/** Altura mínima de una barra, para que un cero siga siendo una cápsula. */
const MIN_HEIGHT_PERCENT = 24;

interface CapsuleBarsProps {
  readonly days: readonly LoadDay[];
  /** Filtra por un día ya ocurrido. Las proyecciones no son accionables. */
  readonly onSelectDay: (date: string) => void;
}

export function CapsuleBars({ days, onSelectDay }: CapsuleBarsProps) {
  const max = Math.max(1, ...days.map((day) => day.value));
  const peak = Math.max(0, ...days.filter((day) => !day.projected).map((day) => day.value));

  return (
    <ol className="flex h-38 items-stretch gap-2 sm:gap-3">
      {days.map((day, index) => {
        // `T12:00` evita que la conversión a hora local mueva la fecha un día.
        const date = new Date(`${day.date}T12:00:00`);
        const height = Math.max(MIN_HEIGHT_PERCENT, (day.value / max) * 100);
        const label = `${formatLongDay(date)}: ${day.value} ${day.value === 1 ? 'incidente' : 'incidentes'}${day.projected ? ' (proyección)' : ''}`;

        const tone = day.projected
          ? 'hatch'
          : day.isToday
            ? 'bg-series-3'
            : day.value === peak
              ? 'bg-series-1'
              : 'bg-series-2';

        const capsule = (
          <>
            {/* La cifra de hoy queda siempre a la vista; las demás aparecen al
                pasar o enfocar, para no llenar el gráfico de números. */}
            <span
              aria-hidden="true"
              className={cn(
                'tabular mb-1.5 rounded-md border border-border-subtle bg-surface-card px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold text-text-primary shadow-card transition-opacity duration-150',
                !day.isToday && 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
            >
              {day.value}
            </span>
            <span
              className={cn('grow-y w-full max-w-14 rounded-pill', tone)}
              style={{
                height: `${height}%`,
                ...cssVars({ '--rise-delay': `${120 + index * 55}ms` }),
              }}
            />
          </>
        );

        return (
          <li key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            {day.projected ? (
              <div
                title={label}
                aria-label={label}
                role="img"
                className="group flex min-h-0 w-full flex-1 flex-col items-center justify-end"
              >
                {capsule}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectDay(day.date)}
                title={label}
                aria-label={`${label}. Ver en la tabla`}
                className="group flex min-h-0 w-full flex-1 flex-col items-center justify-end rounded-2xl transition-transform duration-150 hover:-translate-y-0.5"
              >
                {capsule}
              </button>
            )}
            <span
              aria-hidden="true"
              className={cn(
                'text-xs',
                day.isToday ? 'font-bold text-text-primary' : 'text-text-muted',
              )}
            >
              {WEEKDAY_INITIAL[date.getDay()]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
