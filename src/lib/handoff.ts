/**
 * Informe de traspaso de turno.
 *
 * Al cambiar la guardia, quien se va le cuenta a quien llega qué queda abierto
 * y por dónde empezar. Eso suele ser un mensaje escrito a mano con lo que uno
 * se acuerda; aquí se deriva de los mismos datos que el resto de la consola,
 * así que no puede olvidarse de un crítico.
 *
 * Es una función pura que devuelve tanto los datos —para pintarlos— como el
 * texto plano —para pegarlo en el chat del turno—, y los dos salen de la misma
 * lista para que no puedan contradecirse.
 */

import {
  SHIFT_WINDOW,
  TEAM,
  nextShift,
  shiftAt,
  shiftEndsAt,
  type Analyst,
  type Shift,
} from '@/data/team';
import type { Incident } from '@/types';
import { SEVERITY_META, SHIFT_META, SLA_STATE_META } from './catalog';
import { formatLongDay, formatTime } from './format';
import { buildPriorityQueue, resolvedWithin } from './metrics';
import { slaStatus } from './sla';

/** Cuántos casos se destacan para el turno entrante. */
const PRIORITY_LIMIT = 5;

export interface Handoff {
  readonly outgoing: Shift;
  readonly incoming: Shift;
  /** Quién recibe: la primera persona del turno entrante. */
  readonly receiver: Analyst | null;
  readonly endsAt: Date;
  readonly unresolved: number;
  readonly critical: number;
  /** Abiertos con el plazo vencido o consumido en tres cuartos. */
  readonly overdue: number;
  readonly detectedInShift: number;
  readonly resolvedInShift: number;
  readonly priorities: readonly Incident[];
}

export function buildHandoff(incidents: readonly Incident[], now: number): Handoff {
  const at = new Date(now);
  const outgoing = shiftAt(at);
  const incoming = nextShift(outgoing);

  const shiftStart = new Date(at);
  shiftStart.setHours(SHIFT_WINDOW[outgoing].startHour, 0, 0, 0);
  const startedAt = shiftStart.getTime();

  const unresolved = incidents.filter((incident) => incident.resolvedAt === null);

  return {
    outgoing,
    incoming,
    receiver: TEAM.find((analyst) => analyst.shift === incoming) ?? null,
    endsAt: shiftEndsAt(at),
    unresolved: unresolved.length,
    critical: unresolved.filter((incident) => incident.severity === 'critical').length,
    overdue: unresolved.filter((incident) => {
      const { state } = slaStatus(incident, now);
      return state === 'breached' || state === 'at-risk';
    }).length,
    detectedInShift: incidents.filter((incident) => {
      const detected = Date.parse(incident.detectedAt);
      return detected >= startedAt && detected <= now;
    }).length,
    resolvedInShift: resolvedWithin(incidents, startedAt, now + 1).length,
    priorities: buildPriorityQueue(unresolved, now, PRIORITY_LIMIT),
  };
}

/** El mismo informe en texto plano, listo para pegar. */
export function handoffToText(handoff: Handoff, now: number, author: string): string {
  const at = new Date(now);
  const lines = [
    `TRASPASO DE TURNO · ${SHIFT_META[handoff.outgoing].label} → ${SHIFT_META[handoff.incoming].label}`,
    `${formatLongDay(at)}, ${formatTime(at)}`,
    `Entrega: ${author}${handoff.receiver === null ? '' : ` · Recibe: ${handoff.receiver.name}`}`,
    '',
    'Resumen',
    `- Sin resolver: ${handoff.unresolved} (${handoff.critical} críticos)`,
    `- Con el plazo vencido o en riesgo: ${handoff.overdue}`,
    `- Detectados en el turno: ${handoff.detectedInShift}`,
    `- Resueltos en el turno: ${handoff.resolvedInShift}`,
    '',
    'Por dónde empezar',
  ];

  if (handoff.priorities.length === 0) {
    lines.push('- No queda ningún caso abierto.');
  }

  handoff.priorities.forEach((incident, index) => {
    const { state } = slaStatus(incident, now);
    lines.push(
      `${index + 1}. [${SEVERITY_META[incident.severity].label}] ${incident.id} — ${incident.title} (${incident.assignee} · ${SLA_STATE_META[state].label})`,
    );
  });

  return lines.join('\n');
}
