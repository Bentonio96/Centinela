/**
 * Catálogo de presentación: la única fuente de verdad que traduce los valores
 * del dominio (en inglés) a etiquetas en español y a tokens visuales.
 *
 * Las clases de Tailwind se escriben completas y literales a propósito: el
 * compilador de Tailwind escanea el código fuente, así que una clase construida
 * por concatenación (`bg-severity-${x}`) no se generaría nunca.
 *
 * Los colores de gráfico son `var(...)` en vez de valores fijos para que
 * Recharts siga el cambio de tema sin volver a renderizar.
 */

import type { IncidentCategory, IncidentStatus, Severity } from '@/types';
import { CATEGORIES, SEVERITIES, STATUSES } from '@/types';

export interface SeverityMeta {
  readonly value: Severity;
  /** Etiqueta completa: "Crítica". */
  readonly label: string;
  /** Posición en la escala; 0 es lo más grave. Define el orden de la tabla. */
  readonly rank: number;
  /** Clases del badge: borde, fondo y texto en un solo string literal. */
  readonly badgeClassName: string;
  /** Color del indicador redundante al color de fondo. */
  readonly dotClassName: string;
  readonly chartColor: string;
}

export const SEVERITY_META: Readonly<Record<Severity, SeverityMeta>> = {
  critical: {
    value: 'critical',
    label: 'Crítica',
    rank: 0,
    badgeClassName:
      'border-severity-critical-border bg-severity-critical-bg text-severity-critical',
    dotClassName: 'bg-severity-critical',
    chartColor: 'var(--severity-critical)',
  },
  high: {
    value: 'high',
    label: 'Alta',
    rank: 1,
    badgeClassName: 'border-severity-high-border bg-severity-high-bg text-severity-high',
    dotClassName: 'bg-severity-high',
    chartColor: 'var(--severity-high)',
  },
  medium: {
    value: 'medium',
    label: 'Media',
    rank: 2,
    badgeClassName: 'border-severity-medium-border bg-severity-medium-bg text-severity-medium',
    dotClassName: 'bg-severity-medium',
    chartColor: 'var(--severity-medium)',
  },
  low: {
    value: 'low',
    label: 'Baja',
    rank: 3,
    badgeClassName: 'border-severity-low-border bg-severity-low-bg text-severity-low',
    dotClassName: 'bg-severity-low',
    chartColor: 'var(--severity-low)',
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
}

export const STATUS_META: Readonly<Record<IncidentStatus, StatusMeta>> = {
  open: {
    value: 'open',
    label: 'Abierto',
    rank: 0,
    dotClassName: 'bg-status-open',
    textClassName: 'text-status-open',
  },
  investigating: {
    value: 'investigating',
    label: 'En investigación',
    rank: 1,
    dotClassName: 'bg-status-investigating',
    textClassName: 'text-status-investigating',
  },
  contained: {
    value: 'contained',
    label: 'Contenido',
    rank: 2,
    dotClassName: 'bg-status-contained',
    textClassName: 'text-status-contained',
  },
  resolved: {
    value: 'resolved',
    label: 'Resuelto',
    rank: 3,
    dotClassName: 'bg-status-resolved',
    textClassName: 'text-status-resolved',
  },
};

export const STATUS_OPTIONS: readonly StatusMeta[] = STATUSES.map((status) => STATUS_META[status]);

export interface CategoryMeta {
  readonly value: IncidentCategory;
  readonly label: string;
  /** Versión corta para el eje del gráfico de barras, donde el espacio manda. */
  readonly shortLabel: string;
}

export const CATEGORY_META: Readonly<Record<IncidentCategory, CategoryMeta>> = {
  phishing: { value: 'phishing', label: 'Phishing', shortLabel: 'Phishing' },
  malware: { value: 'malware', label: 'Malware', shortLabel: 'Malware' },
  ransomware: { value: 'ransomware', label: 'Ransomware', shortLabel: 'Ransom.' },
  'unauthorized-access': {
    value: 'unauthorized-access',
    label: 'Acceso no autorizado',
    shortLabel: 'Acceso',
  },
  ddos: { value: 'ddos', label: 'Denegación de servicio', shortLabel: 'DDoS' },
  'data-leak': { value: 'data-leak', label: 'Fuga de datos', shortLabel: 'Fuga' },
  vulnerability: { value: 'vulnerability', label: 'Vulnerabilidad', shortLabel: 'Vuln.' },
  'social-engineering': {
    value: 'social-engineering',
    label: 'Ingeniería social',
    shortLabel: 'Ing. social',
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
