/**
 * Catálogo de presentación: la única fuente de verdad que traduce los valores
 * del dominio (en inglés) a etiquetas en español y a tokens visuales.
 *
 * Las clases de Tailwind se escriben completas y literales a propósito: el
 * compilador de Tailwind escanea el código fuente, así que una clase construida
 * por concatenación (`bg-severity-${x}`) no se generaría nunca.
 *
 * Regla de color de todo el proyecto: **el color con significado es de la
 * severidad y del estado**. Las categorías, las células y los turnos no llevan
 * tono propio; se distinguen por icono y por palabra. Si cada dimensión tuviera
 * su color, ninguno significaría nada.
 */

import {
  Bug,
  DatabaseZap,
  KeyRound,
  LockKeyhole,
  MailWarning,
  ScanSearch,
  VenetianMask,
  Zap,
  type LucideIcon,
} from 'lucide-react';

import type { CalendarEventKind } from '@/data/calendar';
import type { Accent } from '@/data/settings';
import type { AvatarTint, Shift, Squad } from '@/data/team';
import type { IncidentCategory, IncidentStatus, Severity } from '@/types';
import { CATEGORIES, SEVERITIES, STATUSES } from '@/types';
import type { SlaState } from './sla';

export interface SeverityMeta {
  readonly value: Severity;
  /** Etiqueta completa: "Crítica". */
  readonly label: string;
  /**
   * Peso ordinal de la severidad: a mayor número, más grave.
   *
   * Va en este sentido y no al revés para que ordenar la columna de forma
   * descendente ponga las críticas arriba, que es lo que alguien espera al
   * pedir "de mayor a menor severidad" — y lo que entonces anuncia
   * correctamente el `aria-sort` del encabezado.
   */
  readonly weight: number;
  /** Clases del badge: borde, fondo y texto en un solo string literal. */
  readonly badgeClassName: string;
  /** Color del indicador redundante al color de fondo. */
  readonly dotClassName: string;
  /** Color de texto, para el banderín de prioridad del tablero. */
  readonly textClassName: string;
}

export const SEVERITY_META: Readonly<Record<Severity, SeverityMeta>> = {
  critical: {
    value: 'critical',
    label: 'Crítica',
    weight: 3,
    badgeClassName:
      'border-severity-critical-border bg-severity-critical-bg text-severity-critical',
    dotClassName: 'bg-severity-critical',
    textClassName: 'text-severity-critical',
  },
  high: {
    value: 'high',
    label: 'Alta',
    weight: 2,
    badgeClassName: 'border-severity-high-border bg-severity-high-bg text-severity-high',
    dotClassName: 'bg-severity-high',
    textClassName: 'text-severity-high',
  },
  medium: {
    value: 'medium',
    label: 'Media',
    weight: 1,
    badgeClassName: 'border-severity-medium-border bg-severity-medium-bg text-severity-medium',
    dotClassName: 'bg-severity-medium',
    textClassName: 'text-severity-medium',
  },
  low: {
    value: 'low',
    label: 'Baja',
    weight: 0,
    badgeClassName: 'border-severity-low-border bg-severity-low-bg text-severity-low',
    dotClassName: 'bg-severity-low',
    textClassName: 'text-severity-low',
  },
};

/** Las severidades en orden de gravedad, listas para pintar el filtro. */
export const SEVERITY_OPTIONS: readonly SeverityMeta[] = SEVERITIES.map(
  (severity) => SEVERITY_META[severity],
);

export interface StatusMeta {
  readonly value: IncidentStatus;
  readonly label: string;
  readonly rank: number;
  readonly dotClassName: string;
  readonly textClassName: string;
  /** Verbo de la acción que lleva a este estado: "Contener". */
  readonly actionLabel: string;
}

export const STATUS_META: Readonly<Record<IncidentStatus, StatusMeta>> = {
  open: {
    value: 'open',
    label: 'Abierto',
    rank: 0,
    dotClassName: 'bg-status-open',
    textClassName: 'text-status-open',
    actionLabel: 'Reabrir',
  },
  investigating: {
    value: 'investigating',
    label: 'En investigación',
    rank: 1,
    dotClassName: 'bg-status-investigating',
    textClassName: 'text-status-investigating',
    actionLabel: 'Investigar',
  },
  contained: {
    value: 'contained',
    label: 'Contenido',
    rank: 2,
    dotClassName: 'bg-status-contained',
    textClassName: 'text-status-contained',
    actionLabel: 'Contener',
  },
  resolved: {
    value: 'resolved',
    label: 'Resuelto',
    rank: 3,
    dotClassName: 'bg-status-resolved',
    textClassName: 'text-status-resolved',
    actionLabel: 'Resolver',
  },
};

export const STATUS_OPTIONS: readonly StatusMeta[] = STATUSES.map((status) => STATUS_META[status]);

/**
 * Los tres estados que significan "esto todavía es un problema".
 *
 * Vive aquí y no repartido por los componentes porque es una definición del
 * dominio: si mañana apareciera un estado nuevo, el indicador del panel y el
 * filtro que abre al pulsarlo tienen que cambiar juntos o dejarán de coincidir.
 */
export const UNRESOLVED_STATUSES: readonly IncidentStatus[] = [
  'open',
  'investigating',
  'contained',
];

export interface CategoryMeta {
  readonly value: IncidentCategory;
  readonly label: string;
  /** Versión corta para chips y leyendas, donde el espacio manda. */
  readonly shortLabel: string;
  readonly icon: LucideIcon;
}

export const CATEGORY_META: Readonly<Record<IncidentCategory, CategoryMeta>> = {
  phishing: { value: 'phishing', label: 'Phishing', shortLabel: 'Phishing', icon: MailWarning },
  malware: { value: 'malware', label: 'Malware', shortLabel: 'Malware', icon: Bug },
  ransomware: {
    value: 'ransomware',
    label: 'Ransomware',
    shortLabel: 'Ransomware',
    icon: LockKeyhole,
  },
  'unauthorized-access': {
    value: 'unauthorized-access',
    label: 'Acceso no autorizado',
    shortLabel: 'Acceso',
    icon: KeyRound,
  },
  ddos: { value: 'ddos', label: 'Denegación de servicio', shortLabel: 'DDoS', icon: Zap },
  'data-leak': {
    value: 'data-leak',
    label: 'Fuga de datos',
    shortLabel: 'Fuga de datos',
    icon: DatabaseZap,
  },
  vulnerability: {
    value: 'vulnerability',
    label: 'Vulnerabilidad',
    shortLabel: 'Vulnerabilidad',
    icon: ScanSearch,
  },
  'social-engineering': {
    value: 'social-engineering',
    label: 'Ingeniería social',
    shortLabel: 'Ing. social',
    icon: VenetianMask,
  },
};

export const CATEGORY_OPTIONS: readonly CategoryMeta[] = CATEGORIES.map(
  (category) => CATEGORY_META[category],
);

/** Etiquetas de los tipos de activo afectado. */
export const ASSET_KIND_LABEL = {
  server: 'Servidor',
  endpoint: 'Endpoint',
  account: 'Cuenta',
  service: 'Servicio',
  network: 'Red',
} as const satisfies Record<string, string>;

export interface SlaStateMeta {
  readonly label: string;
  readonly textClassName: string;
  /** Relleno de la barra de plazo. */
  readonly barClassName: string;
}

export const SLA_STATE_META: Readonly<Record<SlaState, SlaStateMeta>> = {
  met: {
    label: 'Cumplido',
    textClassName: 'text-status-resolved',
    barClassName: 'bg-status-resolved',
  },
  'on-track': {
    label: 'En plazo',
    textClassName: 'text-text-secondary',
    barClassName: 'bg-brand-600',
  },
  'at-risk': {
    label: 'En riesgo',
    textClassName: 'text-severity-high',
    barClassName: 'bg-severity-high',
  },
  breached: {
    label: 'Vencido',
    textClassName: 'text-severity-critical',
    barClassName: 'bg-severity-critical-solid',
  },
};

export const SQUAD_LABEL: Readonly<Record<Squad, string>> = {
  respuesta: 'Respuesta',
  forense: 'Forense',
  inteligencia: 'Inteligencia',
  monitoreo: 'Monitoreo',
};

export interface ShiftMeta {
  readonly label: string;
  /** Horario legible: "08:00 – 16:00". */
  readonly hours: string;
}

export const SHIFT_META: Readonly<Record<Shift, ShiftMeta>> = {
  morning: { label: 'Mañana', hours: '08:00 – 16:00' },
  afternoon: { label: 'Tarde', hours: '16:00 – 00:00' },
  night: { label: 'Noche', hours: '00:00 – 08:00' },
};

export const AVATAR_TINT_CLASS: Readonly<Record<AvatarTint, string>> = {
  rose: 'bg-avatar-rose',
  mint: 'bg-avatar-mint',
  lavender: 'bg-avatar-lavender',
  sand: 'bg-avatar-sand',
  peach: 'bg-avatar-peach',
  sky: 'bg-avatar-sky',
  lilac: 'bg-avatar-lilac',
  sage: 'bg-avatar-sage',
};

export interface EventKindMeta {
  readonly label: string;
  /** Token CSS con el tono base del tipo de evento. */
  readonly color: string;
}

export const EVENT_KIND_META: Readonly<Record<CalendarEventKind, EventKindMeta>> = {
  meeting: { label: 'Reunión', color: 'var(--event-meeting)' },
  maintenance: { label: 'Mantenimiento', color: 'var(--event-maintenance)' },
  review: { label: 'Revisión', color: 'var(--event-review)' },
  deadline: { label: 'Vencimiento', color: 'var(--event-deadline)' },
  drill: { label: 'Simulacro', color: 'var(--event-drill)' },
};

export interface AccentMeta {
  readonly label: string;
  /**
   * Muestra del acento. Es un valor fijo y no un token porque tiene que
   * enseñar los cuatro a la vez, y los tokens de marca sólo valen el activo.
   */
  readonly swatch: string;
}

export const ACCENT_META: Readonly<Record<Accent, AccentMeta>> = {
  forest: { label: 'Bosque', swatch: '#135631' },
  ocean: { label: 'Océano', swatch: '#173f86' },
  plum: { label: 'Ciruela', swatch: '#4a2080' },
  ember: { label: 'Brasa', swatch: '#7a2c12' },
};

/**
 * Días de la semana con lunes = 0, que es como indexa sus filas el mapa de
 * calor. Ojo: `Date.getDay()` empieza en domingo.
 */
export const WEEKDAY_LONG = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;
