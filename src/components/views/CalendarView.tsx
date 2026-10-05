/**
 * Calendario: la agenda operativa del equipo cruzada con los incidentes de
 * cada día.
 *
 * La rejilla es una `<table>` real con un `<th>` por día de la semana. Un
 * calendario *es* una tabla —filas de semanas, columnas de días— y marcarlo
 * como tal es lo que deja a un lector de pantalla anunciar "miércoles" al
 * entrar en una celda, en vez de un número suelto.
 *
 * Cada celda lleva dos capas que no se mezclan: los eventos agendados, como
 * chips con el color de su tipo, y el número de incidentes detectados ese día,
 * como una cifra discreta en la esquina. Lo primero es lo planificado; lo
 * segundo, lo que pasó.
 */

import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { EVENT_KINDS, eventsBetween, eventsForDate, type CalendarEvent } from '@/data/calendar';
import { EVENT_KIND_META } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import {
  formatLongDay,
  formatMonthYear,
  formatWeekday,
  startOfLocalDay,
  toLocalDateKey,
} from '@/lib/format';
import { countByDay } from '@/lib/metrics';
import type { ViewProps } from '@/types/app';

/** Encabezados de columna, indexados como `Date.getDay()`: 0 = domingo. */
const WEEKDAY_HEADERS = [
  { short: 'Dom', long: 'Domingo' },
  { short: 'Lun', long: 'Lunes' },
  { short: 'Mar', long: 'Martes' },
  { short: 'Mié', long: 'Miércoles' },
  { short: 'Jue', long: 'Jueves' },
  { short: 'Vie', long: 'Viernes' },
  { short: 'Sáb', long: 'Sábado' },
] as const;

const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

/** Chips de evento que caben en una celda antes de resumir con "+N". */
const MAX_CHIPS = 2;
/** Cuántos eventos lista "Próximos" y hasta cuántos días mira. */
const UPCOMING_LIMIT = 5;
const UPCOMING_DAYS = 21;

interface DayCell {
  readonly date: Date;
  readonly key: string;
  readonly inMonth: boolean;
  readonly events: readonly CalendarEvent[];
}

/** Las semanas que cubren el mes, completas: incluye días de los meses vecinos. */
function buildWeeks(year: number, month: number, weekStartsOn: number): DayCell[][] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStartsOn + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);

  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(year, month, 1 - offset + week * 7 + day);
      return {
        date,
        key: toLocalDateKey(date),
        inMonth: date.getMonth() === month,
        events: eventsForDate(date),
      };
    }),
  );
}

function EventRow({ event }: { readonly event: CalendarEvent }) {
  const meta = EVENT_KIND_META[event.kind];

  return (
    <li
      className="flex gap-3 rounded-control bg-surface-sunken py-2.5 pr-3 pl-0 dark:bg-surface-hover"
      style={cssVars({ '--tint': meta.color })}
    >
      <span aria-hidden="true" className="w-1 shrink-0 rounded-r-pill bg-(--tint)" />
      <div className="tabular w-11 shrink-0 text-xs leading-tight">
        <p className="font-semibold text-text-primary">{event.start}</p>
        <p className="text-text-muted">{event.end}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-semibold text-text-primary">{event.title}</p>
        <p className="tint-text mt-0.5 text-xs font-semibold">{meta.label}</p>
        <div className="mt-1.5 flex -space-x-1.5" title={event.attendees.join(', ')}>
          {event.attendees.map((name) => (
            <Avatar key={name} name={name} size="xs" className="ring-2 ring-surface-sunken" />
          ))}
          <span className="sr-only">Convocados: {event.attendees.join(', ')}</span>
        </div>
      </div>
    </li>
  );
}

export function CalendarView({ incidents, now, settings, actions, headingRef }: ViewProps) {
  const today = startOfLocalDay(now);
  const todayKey = toLocalDateKey(today);

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const weekStartsOn = settings.weekStart === 'monday' ? 1 : 0;
  const weeks = useMemo(
    () => buildWeeks(cursor.year, cursor.month, weekStartsOn),
    [cursor, weekStartsOn],
  );
  const incidentCounts = useMemo(() => countByDay(incidents), [incidents]);

  // `T12:00` evita que la conversión a hora local mueva la fecha un día.
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const selectedEvents = useMemo(
    () => eventsForDate(new Date(`${selectedKey}T12:00:00`)),
    [selectedKey],
  );
  const selectedIncidents = incidentCounts.get(selectedKey) ?? 0;
  const selectedCritical = useMemo(
    () =>
      incidents.filter(
        (incident) =>
          incident.severity === 'critical' &&
          toLocalDateKey(new Date(incident.detectedAt)) === selectedKey,
      ).length,
    [incidents, selectedKey],
  );

  const upcoming = useMemo(() => {
    const start = startOfLocalDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + UPCOMING_DAYS);
    return eventsBetween(start, end).slice(0, UPCOMING_LIMIT);
  }, [now]);

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const goToToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedKey(todayKey);
  };

  const columnOrder = Array.from({ length: 7 }, (_, index) => (weekStartsOn + index) % 7);

  return (
    <div className="flex flex-col gap-gutter-sm">
      <PageHeader
        headingRef={headingRef}
        title="Calendario"
        description="Comités, mantenimientos, simulacros y vencimientos del equipo."
        actions={
          <Button onClick={goToToday}>
            <CalendarDays aria-hidden="true" className="size-4" />
            Hoy
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-gutter-sm xl:grid-cols-12">
        <Card as="section" aria-labelledby="mes-titulo" className="rise xl:col-span-8">
          <CardHeader className="pb-3">
            {/* `aria-live`: el mes cambia lejos de los botones que lo provocan. */}
            <CardTitle id="mes-titulo" aria-live="polite" className="text-lg">
              {formatMonthYear(new Date(cursor.year, cursor.month, 1))}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Button size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
                <ChevronLeft aria-hidden="true" className="size-4" />
              </Button>
              <Button size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
                <ChevronRight aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <div className="px-2 pb-2 sm:px-3">
            <table className="w-full table-fixed border-separate border-spacing-1">
              <caption className="sr-only">
                Agenda de {formatMonthYear(new Date(cursor.year, cursor.month, 1))}. Cada día
                muestra sus eventos y cuántos incidentes se detectaron.
              </caption>
              <thead>
                <tr>
                  {columnOrder.map((weekday) => (
                    <th
                      key={weekday}
                      scope="col"
                      abbr={WEEKDAY_HEADERS[weekday]?.long}
                      className="pb-1.5 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase"
                    >
                      {WEEKDAY_HEADERS[weekday]?.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => (
                  <tr key={week[0]?.key}>
                    {week.map((day) => {
                      const isToday = day.key === todayKey;
                      const isSelected = day.key === selectedKey;
                      const count = incidentCounts.get(day.key) ?? 0;

                      return (
                        <td key={day.key} className="p-0 align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedKey(day.key)}
                            aria-pressed={isSelected}
                            aria-label={`${formatLongDay(day.date)}: ${day.events.length} ${day.events.length === 1 ? 'evento' : 'eventos'}, ${count} ${count === 1 ? 'incidente' : 'incidentes'}`}
                            className={cn(
                              'flex h-18 w-full flex-col gap-1 rounded-control p-1.5 text-left transition-colors sm:h-24',
                              day.inMonth
                                ? 'bg-surface-sunken hover:bg-surface-hover dark:bg-surface-panel'
                                : 'bg-transparent hover:bg-surface-sunken',
                              isSelected && 'ring-2 ring-accent ring-inset',
                            )}
                          >
                            <span className="flex items-center justify-between gap-1">
                              <span
                                className={cn(
                                  'tabular grid size-6 place-items-center rounded-pill text-xs font-semibold',
                                  isToday
                                    ? 'bg-accent text-accent-contrast'
                                    : day.inMonth
                                      ? 'text-text-primary'
                                      : 'text-text-muted',
                                )}
                              >
                                {day.date.getDate()}
                              </span>
                              {count > 0 && (
                                <span
                                  aria-hidden="true"
                                  className="tabular hidden items-center gap-0.5 text-[0.625rem] font-semibold text-text-muted sm:flex"
                                >
                                  <ShieldAlert className="size-2.5" />
                                  {count}
                                </span>
                              )}
                            </span>

                            {/* En móvil sólo puntos: un chip con texto no cabe
                                en una celda de 44px. */}
                            <span aria-hidden="true" className="flex gap-0.5 sm:hidden">
                              {day.events.map((event) => (
                                <span
                                  key={event.id}
                                  className="size-1.5 rounded-pill"
                                  style={{ backgroundColor: EVENT_KIND_META[event.kind].color }}
                                />
                              ))}
                            </span>

                            <span aria-hidden="true" className="hidden flex-col gap-0.5 sm:flex">
                              {day.events.slice(0, MAX_CHIPS).map((event) => (
                                <span
                                  key={event.id}
                                  className="tint-chip truncate rounded-md border-0 px-1.5 py-0.5 text-[0.625rem] leading-tight font-semibold"
                                  style={cssVars({ '--tint': EVENT_KIND_META[event.kind].color })}
                                >
                                  {event.title}
                                </span>
                              ))}
                              {day.events.length > MAX_CHIPS && (
                                <span className="px-1.5 text-[0.625rem] font-semibold text-text-muted">
                                  +{day.events.length - MAX_CHIPS} más
                                </span>
                              )}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="flex flex-wrap gap-x-4 gap-y-1 px-2 pt-2 pb-2 text-xs text-text-secondary">
              {EVENT_KINDS.map((kind) => (
                <li key={kind} className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-pill"
                    style={{ backgroundColor: EVENT_KIND_META[kind].color }}
                  />
                  {EVENT_KIND_META[kind].label}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <div className="flex flex-col gap-gutter-sm xl:col-span-4">
          <Card
            as="section"
            aria-labelledby="dia-titulo"
            className="rise"
            style={cssVars({ '--rise-delay': '80ms' })}
          >
            <div className="px-4.5 pt-4">
              <p className="text-[0.6875rem] font-semibold tracking-wider text-accent-text uppercase">
                {selectedKey === todayKey ? 'Hoy · ' : ''}
                {formatWeekday(selectedDate)}
              </p>
              <h2 id="dia-titulo" className="mt-0.5 text-2xl font-semibold tracking-tight">
                {selectedDate.getDate()} de{' '}
                {formatMonthYear(selectedDate).split(' ')[0]?.toLowerCase()}
              </h2>
            </div>

            <div className="px-4.5 pt-3 pb-4">
              {selectedEvents.length === 0 ? (
                <p className="rounded-control bg-surface-sunken px-3 py-4 text-center text-sm text-text-muted dark:bg-surface-hover">
                  Sin eventos agendados.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {selectedEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </ul>
              )}

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
                <p className="text-sm text-text-secondary">
                  <span className="tabular font-semibold text-text-primary">
                    {selectedIncidents}
                  </span>{' '}
                  {selectedIncidents === 1 ? 'incidente' : 'incidentes'}
                  {selectedCritical > 0 && (
                    <span className="text-severity-critical">
                      {' '}
                      · {selectedCritical} {selectedCritical === 1 ? 'crítico' : 'críticos'}
                    </span>
                  )}
                </p>
                <Button
                  size="sm"
                  variant="soft"
                  disabled={selectedIncidents === 0}
                  onClick={() => actions.showIncidents({ day: selectedKey })}
                >
                  Ver
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          <Card
            as="section"
            aria-labelledby="proximos-titulo"
            className="rise"
            style={cssVars({ '--rise-delay': '140ms' })}
          >
            <CardHeader>
              <CardTitle id="proximos-titulo">Próximos</CardTitle>
            </CardHeader>
            <ul className="flex flex-col gap-0.5 px-2 pt-2 pb-2.5">
              {upcoming.map((event) => {
                const date = new Date(`${event.date}T12:00:00`);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCursor({ year: date.getFullYear(), month: date.getMonth() });
                        setSelectedKey(event.date);
                      }}
                      className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span className="grid w-10 shrink-0 place-items-center rounded-[0.625rem] bg-accent-soft py-1 text-accent-text">
                        <span className="text-[0.5625rem] leading-none font-bold tracking-wider uppercase">
                          {MONTH_SHORT[date.getMonth()]}
                        </span>
                        <span className="tabular text-base leading-tight font-semibold">
                          {date.getDate()}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">
                          {event.title}
                        </span>
                        <span className="tabular block truncate text-xs text-text-muted">
                          {event.date === todayKey ? 'Hoy' : formatWeekday(date)} · {event.start}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
