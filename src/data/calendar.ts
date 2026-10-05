/**
 * Agenda operativa del equipo: comités, ventanas de mantenimiento, revisiones,
 * vencimientos y simulacros.
 *
 * No hay semilla aleatoria aquí. Los eventos salen de reglas de calendario
 * ("todos los lunes", "el segundo martes", "el último día hábil"), que es como
 * se agenda de verdad la operación de un SOC, y que además hace que cualquier
 * mes —pasado o futuro— tenga agenda sin generar nada por adelantado.
 */

import { toLocalDateKey } from '@/lib/format';

export const EVENT_KINDS = ['meeting', 'maintenance', 'review', 'deadline', 'drill'] as const;
export type CalendarEventKind = (typeof EVENT_KINDS)[number];

export interface CalendarEvent {
  readonly id: string;
  readonly kind: CalendarEventKind;
  readonly title: string;
  /** Día `YYYY-MM-DD` en hora local. */
  readonly date: string;
  /** Hora de inicio `HH:MM`. */
  readonly start: string;
  readonly end: string;
  /** Analistas convocados, por nombre. */
  readonly attendees: readonly string[];
}

interface EventSeed {
  readonly kind: CalendarEventKind;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly attendees: readonly string[];
}

const MONDAY = 1;
const TUESDAY = 2;
const WEDNESDAY = 3;
const THURSDAY = 4;
const FRIDAY = 5;
const SATURDAY = 6;

function isBusinessDay(date: Date): boolean {
  const weekday = date.getDay();
  return weekday !== 0 && weekday !== SATURDAY;
}

/** Día del mes del primer día hábil. */
function firstBusinessDay(year: number, month: number): number {
  for (let day = 1; day <= 7; day += 1) {
    if (isBusinessDay(new Date(year, month, day))) return day;
  }
  return 1;
}

/** Día del mes del último día hábil. */
function lastBusinessDay(year: number, month: number): number {
  const last = new Date(year, month + 1, 0).getDate();
  for (let day = last; day > last - 7; day -= 1) {
    if (isBusinessDay(new Date(year, month, day))) return day;
  }
  return last;
}

/** El primer día hábil en o después del día dado. */
function onOrAfterBusinessDay(year: number, month: number, day: number): number {
  const last = new Date(year, month + 1, 0).getDate();
  for (let candidate = day; candidate <= last; candidate += 1) {
    if (isBusinessDay(new Date(year, month, candidate))) return candidate;
  }
  return day;
}

/** Qué ocurrencia de su día de la semana es dentro del mes: 1 = la primera. */
function weekdayOccurrence(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

/** Los eventos que las reglas ponen en un día concreto. */
function seedsForDay(date: Date): EventSeed[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const weekday = date.getDay();
  const occurrence = weekdayOccurrence(date);
  const seeds: EventSeed[] = [];

  if (day === firstBusinessDay(year, month)) {
    seeds.push({
      kind: 'meeting',
      title: 'Planificación de guardias del mes',
      start: '10:00',
      end: '11:00',
      attendees: ['Camila Rojas', 'Diego Fuentes', 'Ignacio Peña'],
    });
  }

  if (weekday === MONDAY) {
    seeds.push({
      kind: 'meeting',
      title: 'Comité semanal de seguridad',
      start: '09:30',
      end: '10:15',
      attendees: ['Camila Rojas', 'Fernanda Ríos', 'Valentina Soto'],
    });
  }

  if (weekday === TUESDAY && occurrence === 2) {
    seeds.push({
      kind: 'maintenance',
      title: 'Parcheo mensual de servidores',
      start: '22:00',
      end: '02:00',
      attendees: ['Antonia Vidal', 'Matías Herrera'],
    });
  }

  if (weekday === WEDNESDAY && occurrence === 3) {
    seeds.push({
      kind: 'meeting',
      title: 'Capacitación: respuesta a incidentes',
      start: '09:00',
      end: '10:30',
      attendees: ['Valentina Soto', 'Sebastián Muñoz', 'Matías Herrera'],
    });
  }

  if (weekday === THURSDAY && occurrence % 2 === 1) {
    seeds.push({
      kind: 'drill',
      title: occurrence === 1 ? 'Simulacro de phishing' : 'Ejercicio de mesa: ransomware',
      start: '15:00',
      end: '16:00',
      attendees: ['Fernanda Ríos', 'Diego Fuentes'],
    });
  }

  if (weekday === FRIDAY) {
    seeds.push({
      kind: 'review',
      title: 'Revisión post-incidente',
      start: '16:00',
      end: '16:45',
      attendees: ['Camila Rojas', 'Valentina Soto', 'Sebastián Muñoz'],
    });
  }

  if (weekday === SATURDAY && occurrence === 1) {
    seeds.push({
      kind: 'maintenance',
      title: 'Ventana de mantenimiento · fw-borde-02',
      start: '23:00',
      end: '01:00',
      attendees: ['Ignacio Peña'],
    });
  }

  if (day === onOrAfterBusinessDay(year, month, 15)) {
    seeds.push({
      kind: 'deadline',
      title: 'Rotación de credenciales de servicio',
      start: '12:00',
      end: '18:00',
      attendees: ['Antonia Vidal'],
    });
  }

  if (month % 2 === 1 && day === onOrAfterBusinessDay(year, month, 21)) {
    seeds.push({
      kind: 'deadline',
      title: 'Vence certificado TLS · portal-clientes',
      start: '09:00',
      end: '09:30',
      attendees: ['Antonia Vidal', 'Diego Fuentes'],
    });
  }

  if (day === lastBusinessDay(year, month)) {
    seeds.push({
      kind: 'deadline',
      title: 'Informe mensual al directorio',
      start: '17:00',
      end: '18:00',
      attendees: ['Camila Rojas', 'Fernanda Ríos'],
    });
  }

  return seeds.sort((a, b) => a.start.localeCompare(b.start));
}

/** Eventos de un día, ordenados por hora de inicio. */
export function eventsForDate(date: Date): CalendarEvent[] {
  const key = toLocalDateKey(date);
  return seedsForDay(date).map((seed, index) => ({
    ...seed,
    id: `${key}-${index}`,
    date: key,
  }));
}

/** Todos los eventos entre dos días, ambos incluidos. */
export function eventsBetween(from: Date, to: Date): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();

  while (cursor.getTime() <= end) {
    events.push(...eventsForDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return events;
}
