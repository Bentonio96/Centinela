/**
 * Informe de traspaso de turno, listo para leer y para pegar.
 *
 * Muestra el resumen como cifras y la lista de prioridades como filas que
 * abren el incidente; el botón copia la versión en texto plano, que es la que
 * acaba en el chat del turno. Ambas salen de `buildHandoff`.
 */

import { ClipboardCopy } from 'lucide-react';
import { useMemo } from 'react';

import { SeverityBadge } from '@/components/incidents/SeverityBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { toasts } from '@/data/toasts';
import { SHIFT_META, SLA_STATE_META } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatTime } from '@/lib/format';
import { buildHandoff, handoffToText } from '@/lib/handoff';
import { slaStatus } from '@/lib/sla';
import type { Incident } from '@/types';

interface HandoffDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly incidents: readonly Incident[];
  readonly now: number;
  readonly me: string;
  readonly onOpenIncident: (incident: Incident) => void;
}

interface FigureProps {
  readonly label: string;
  readonly value: number;
  readonly emphasis?: boolean;
}

function Figure({ label, value, emphasis = false }: FigureProps) {
  return (
    <div className="rounded-control bg-surface-sunken px-3 py-2.5">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd
        className={cn(
          'tabular mt-0.5 text-2xl leading-tight font-semibold',
          emphasis && value > 0 ? 'text-severity-critical' : 'text-text-primary',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function HandoffDialog({
  open,
  onClose,
  incidents,
  now,
  me,
  onOpenIncident,
}: HandoffDialogProps) {
  // Con el diálogo cerrado no hay nada que calcular.
  const handoff = useMemo(
    () => (open ? buildHandoff(incidents, now) : null),
    [open, incidents, now],
  );

  const handleCopy = async () => {
    if (handoff === null) return;

    try {
      // `clipboard` sólo existe en contexto seguro; si falla hay que decirlo
      // en lugar de fingir que copió.
      await navigator.clipboard.writeText(handoffToText(handoff, now, me));
      toasts.push({ title: 'Informe copiado', description: 'Listo para pegar', tone: 'success' });
    } catch {
      toasts.push({ title: 'No se pudo copiar el informe' });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Traspaso de turno"
      description={
        handoff === null
          ? undefined
          : `${SHIFT_META[handoff.outgoing].label} → ${SHIFT_META[handoff.incoming].label} · a las ${formatTime(handoff.endsAt)}`
      }
      size="lg"
      footer={
        <>
          <Button onClick={onClose}>Cerrar</Button>
          <Button
            variant="primary"
            onClick={() => {
              void handleCopy();
            }}
          >
            <ClipboardCopy aria-hidden="true" className="size-4" />
            Copiar informe
          </Button>
        </>
      }
    >
      {handoff !== null && (
        <div className="flex flex-col gap-5">
          {handoff.receiver !== null && (
            <div className="flex items-center gap-3">
              <Avatar name={handoff.receiver.name} size="md" />
              <p className="text-sm text-text-secondary">
                Recibe{' '}
                <span className="font-semibold text-text-primary">{handoff.receiver.name}</span>,{' '}
                {handoff.receiver.role.toLowerCase()}.
              </p>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Figure label="Sin resolver" value={handoff.unresolved} />
            <Figure label="Críticos" value={handoff.critical} emphasis />
            <Figure label="Plazo en riesgo" value={handoff.overdue} emphasis />
            <Figure label="Resueltos en el turno" value={handoff.resolvedInShift} />
          </dl>

          <section>
            <h3 className="mb-2 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
              Por dónde empezar
            </h3>

            {handoff.priorities.length === 0 ? (
              <p className="text-sm text-text-secondary">No queda ningún caso abierto.</p>
            ) : (
              <ol className="flex flex-col gap-1.5">
                {handoff.priorities.map((incident) => {
                  const { state } = slaStatus(incident, now);
                  return (
                    <li key={incident.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          // Tras el cierre: un diálogo no se abre encima de
                          // otro que todavía está devolviendo el foco.
                          setTimeout(() => onOpenIncident(incident), 0);
                        }}
                        className="flex w-full items-center gap-3 rounded-control bg-surface-sunken px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-text-primary">
                            {incident.title}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-text-muted">
                            <span className="font-mono">{incident.id}</span> · {incident.assignee} ·{' '}
                            <span className={SLA_STATE_META[state].textClassName}>
                              {SLA_STATE_META[state].label}
                            </span>
                          </span>
                        </span>
                        <SeverityBadge severity={incident.severity} />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
