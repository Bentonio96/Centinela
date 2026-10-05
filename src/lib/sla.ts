/**
 * Plazos de resolución (SLA) por severidad.
 *
 * El plazo es una propiedad de la severidad, no del incidente: un crítico tiene
 * doce horas se llame como se llame. Por eso no se guarda en cada registro y se
 * calcula al mirar, igual que el resto de las métricas.
 */

import type { Incident, Severity } from '@/types';

/** Horas máximas entre la detección y el cierre. */
export const SLA_HOURS: Readonly<Record<Severity, number>> = {
  critical: 12,
  high: 36,
  medium: 72,
  low: 168,
};

/** A partir de qué fracción del plazo consumido un caso abierto está "en riesgo". */
const AT_RISK_RATIO = 0.75;

export type SlaState = 'met' | 'on-track' | 'at-risk' | 'breached';

export interface SlaStatus {
  readonly state: SlaState;
  readonly targetHours: number;
  readonly elapsedHours: number;
  /** Fracción del plazo consumida. Puede pasar de 1: no se acota. */
  readonly ratio: number;
}

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export function slaStatus(incident: Incident, now: number): SlaStatus {
  const targetHours = SLA_HOURS[incident.severity];
  const detected = Date.parse(incident.detectedAt);
  const end = incident.resolvedAt === null ? now : Date.parse(incident.resolvedAt);
  const elapsedHours = Math.max(0, (end - detected) / HOUR_MS);
  const ratio = elapsedHours / targetHours;

  let state: SlaState;
  if (incident.resolvedAt !== null) {
    state = ratio <= 1 ? 'met' : 'breached';
  } else if (ratio > 1) {
    state = 'breached';
  } else if (ratio >= AT_RISK_RATIO) {
    state = 'at-risk';
  } else {
    state = 'on-track';
  }

  return { state, targetHours, elapsedHours, ratio };
}

export interface SlaSummary {
  readonly total: number;
  /** Cerrados dentro del plazo. */
  readonly met: number;
  /** Abiertos con el plazo todavía vigente, en riesgo o no. */
  readonly running: number;
  /** Fuera de plazo, cerrados o no. */
  readonly breached: number;
  /** De los abiertos con plazo vigente, cuántos ya consumieron tres cuartos. */
  readonly atRisk: number;
}

/** Reparto del cumplimiento sobre los incidentes detectados en la ventana. */
export function summarizeSla(
  incidents: readonly Incident[],
  now: number,
  days: number,
): SlaSummary {
  const windowStart = now - days * DAY_MS;
  let met = 0;
  let running = 0;
  let breached = 0;
  let atRisk = 0;

  for (const incident of incidents) {
    const detected = Date.parse(incident.detectedAt);
    if (detected < windowStart || detected > now) continue;

    const { state } = slaStatus(incident, now);
    if (state === 'met') met += 1;
    else if (state === 'breached') breached += 1;
    else {
      running += 1;
      if (state === 'at-risk') atRisk += 1;
    }
  }

  return { total: met + running + breached, met, running, breached, atRisk };
}
