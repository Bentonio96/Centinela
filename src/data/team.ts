/**
 * El equipo de respuesta: quién es cada analista, a qué célula pertenece y en
 * qué turno trabaja.
 *
 * Los nombres coinciden uno a uno con `ANALYSTS` en `templates.ts`, que es de
 * donde el generador saca el responsable de cada incidente. Este archivo sólo
 * añade lo que la interfaz necesita saber de cada persona; si un nombre
 * existiera en un lado y no en el otro, `findAnalyst` devolvería `undefined` y
 * la vista de equipo lo mostraría sin ficha, en vez de inventarla.
 */

export const SQUADS = ['respuesta', 'forense', 'inteligencia', 'monitoreo'] as const;
export type Squad = (typeof SQUADS)[number];

export const SHIFTS = ['morning', 'afternoon', 'night'] as const;
export type Shift = (typeof SHIFTS)[number];

export const AVATAR_TINTS = [
  'rose',
  'mint',
  'lavender',
  'sand',
  'peach',
  'sky',
  'lilac',
  'sage',
] as const;
export type AvatarTint = (typeof AVATAR_TINTS)[number];

export interface Analyst {
  readonly name: string;
  readonly initials: string;
  readonly role: string;
  readonly squad: Squad;
  readonly shift: Shift;
  readonly location: string;
  readonly tint: AvatarTint;
}

export const TEAM: readonly Analyst[] = [
  {
    name: 'Camila Rojas',
    initials: 'CR',
    role: 'Líder de respuesta',
    squad: 'respuesta',
    shift: 'morning',
    location: 'Santiago',
    tint: 'peach',
  },
  {
    name: 'Diego Fuentes',
    initials: 'DF',
    role: 'Analista SOC N2',
    squad: 'respuesta',
    shift: 'afternoon',
    location: 'Valparaíso',
    tint: 'mint',
  },
  {
    name: 'Valentina Soto',
    initials: 'VS',
    role: 'Analista forense',
    squad: 'forense',
    shift: 'morning',
    location: 'Santiago',
    tint: 'rose',
  },
  {
    name: 'Matías Herrera',
    initials: 'MH',
    role: 'Analista SOC N1',
    squad: 'monitoreo',
    shift: 'night',
    location: 'Concepción',
    tint: 'lavender',
  },
  {
    name: 'Fernanda Ríos',
    initials: 'FR',
    role: 'Inteligencia de amenazas',
    squad: 'inteligencia',
    shift: 'morning',
    location: 'Santiago',
    tint: 'sand',
  },
  {
    name: 'Ignacio Peña',
    initials: 'IP',
    role: 'Analista SOC N2',
    squad: 'respuesta',
    shift: 'night',
    location: 'Temuco',
    tint: 'sky',
  },
  {
    name: 'Antonia Vidal',
    initials: 'AV',
    role: 'Ingeniera de detección',
    squad: 'monitoreo',
    shift: 'afternoon',
    location: 'Santiago',
    tint: 'lilac',
  },
  {
    name: 'Sebastián Muñoz',
    initials: 'SM',
    role: 'Analista forense',
    squad: 'forense',
    shift: 'afternoon',
    location: 'Antofagasta',
    tint: 'sage',
  },
];

/** Quién usa la consola si nadie eligió otra cosa en los ajustes. */
export const DEFAULT_ANALYST = 'Camila Rojas';

const TEAM_BY_NAME: ReadonlyMap<string, Analyst> = new Map(
  TEAM.map((analyst) => [analyst.name, analyst]),
);

export function findAnalyst(name: string): Analyst | undefined {
  return TEAM_BY_NAME.get(name);
}

export function isAnalystName(name: string): boolean {
  return TEAM_BY_NAME.has(name);
}

export interface ShiftWindow {
  /** Hora local de inicio, incluida. */
  readonly startHour: number;
  /** Hora local de fin, excluida. */
  readonly endHour: number;
}

/** Tres turnos de ocho horas que cubren el día sin solaparse. */
export const SHIFT_WINDOW: Readonly<Record<Shift, ShiftWindow>> = {
  night: { startHour: 0, endHour: 8 },
  morning: { startHour: 8, endHour: 16 },
  afternoon: { startHour: 16, endHour: 24 },
};

/** El turno que cubre ese instante. */
export function shiftAt(date: Date): Shift {
  const hour = date.getHours();
  if (hour < 8) return 'night';
  if (hour < 16) return 'morning';
  return 'afternoon';
}

/** El turno que entra cuando termina el dado. */
export function nextShift(shift: Shift): Shift {
  if (shift === 'night') return 'morning';
  if (shift === 'morning') return 'afternoon';
  return 'night';
}

export function isOnShift(analyst: Analyst, date: Date): boolean {
  return analyst.shift === shiftAt(date);
}

/** Instante en que termina el turno en curso: es la hora del próximo traspaso. */
export function shiftEndsAt(date: Date): Date {
  const end = new Date(date);
  end.setHours(SHIFT_WINDOW[shiftAt(date)].endHour, 0, 0, 0);
  return end;
}
