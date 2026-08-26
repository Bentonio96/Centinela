/**
 * Modelo de dominio del dashboard de incidentes.
 *
 * Convención del proyecto: los identificadores del código están en inglés
 * (`severity`, `status`, `critical`) y el texto visible para el usuario en
 * español. Las etiquetas en español viven en `src/lib/catalog.ts`, nunca
 * incrustadas en los tipos, para que la capa de datos sea agnóstica del idioma.
 */

/** Severidades ordenadas de mayor a menor impacto. El orden importa: se usa para ordenar la tabla. */
export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export type Severity = (typeof SEVERITIES)[number];

/** Estados del ciclo de vida de un incidente, en orden de progresión. */
export const STATUSES = ['open', 'investigating', 'contained', 'resolved'] as const;
export type IncidentStatus = (typeof STATUSES)[number];

/** Categorías de amenaza. Alimentan el gráfico de barras. */
export const CATEGORIES = [
  'phishing',
  'malware',
  'ransomware',
  'unauthorized-access',
  'ddos',
  'data-leak',
  'vulnerability',
  'social-engineering',
] as const;
export type IncidentCategory = (typeof CATEGORIES)[number];

/** Una entrada de la bitácora de un incidente, mostrada en el panel de detalle. */
export interface IncidentEvent {
  /** Fecha y hora en formato ISO 8601 (UTC). */
  readonly at: string;
  /** Qué ocurrió, en español y en pasado: "Alerta generada por el SIEM". */
  readonly summary: string;
  /** Quién o qué lo registró: un analista o un sistema automático. */
  readonly actor: string;
}

/** Un activo afectado por el incidente (servidor, endpoint, cuenta, servicio). */
export interface AffectedAsset {
  readonly id: string;
  readonly name: string;
  readonly kind: 'server' | 'endpoint' | 'account' | 'service' | 'network';
}

/**
 * Un incidente de seguridad. Es la unidad de datos de todo el dashboard:
 * las métricas, ambos gráficos y la tabla derivan de una lista de estos.
 */
export interface Incident {
  /** Identificador legible y estable: `INC-2026-0042`. */
  readonly id: string;
  readonly title: string;
  /** Resumen de uno o dos párrafos, visible en el panel de detalle. */
  readonly description: string;
  readonly severity: Severity;
  readonly status: IncidentStatus;
  readonly category: IncidentCategory;
  /** Momento de detección, ISO 8601. Define la posición en el gráfico de tendencia. */
  readonly detectedAt: string;
  /** ISO 8601, o `null` si el incidente sigue sin resolverse. */
  readonly resolvedAt: string | null;
  /** Analista responsable. */
  readonly assignee: string;
  readonly affectedAssets: readonly AffectedAsset[];
  /** IP de origen cuando la hay; `null` para incidentes sin origen de red. */
  readonly sourceIp: string | null;
  /** Bitácora en orden cronológico ascendente. */
  readonly timeline: readonly IncidentEvent[];
}
