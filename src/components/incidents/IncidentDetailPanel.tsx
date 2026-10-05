/**
 * Detalle completo de un incidente, en el panel lateral.
 *
 * El panel se mantiene montado aunque no haya incidente seleccionado: es
 * `SidePanel` quien controla la apertura, y desmontarlo aquí impediría que el
 * navegador ejecute el cierre del `<dialog>` y devuelva el foco a la fila.
 *
 * Además de leer, aquí se actúa: avanzar el estado y reasignar. Son las dos
 * cosas que un analista hace con un caso abierto, y obligarle a ir al tablero
 * para arrastrarlo sería separar la decisión del sitio donde se toma.
 */

import { useId, type ReactNode } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CONTROL_CLASS } from '@/components/ui/control';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SidePanel } from '@/components/ui/SidePanel';
import { TEAM } from '@/data/team';
import {
  ASSET_KIND_LABEL,
  CATEGORY_META,
  SLA_STATE_META,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatDurationFromHours, formatLongDateTime, formatMediumDateTime } from '@/lib/format';
import { slaStatus } from '@/lib/sla';
import type { Incident, IncidentStatus } from '@/types';
import { IncidentTimeline } from './IncidentTimeline';
import { SeverityBadge } from './SeverityBadge';
import { StatusPill } from './StatusPill';

interface DetailFieldProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Par etiqueta/valor. Es `dt`/`dd` real: la relación entre ambos se anuncia sola. */
function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text-primary">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { readonly children: ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
      {children}
    </h3>
  );
}

interface IncidentDetailPanelProps {
  readonly incident: Incident | null;
  /** Instante contra el que se mide el plazo. */
  readonly now: number;
  readonly onClose: () => void;
  /** Recorrido por la página visible sin cerrar el panel. */
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
  readonly onChangeStatus: (incident: Incident, status: IncidentStatus) => void;
  readonly onAssign: (incident: Incident, assignee: string) => void;
}

export function IncidentDetailPanel({
  incident,
  now,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onChangeStatus,
  onAssign,
}: IncidentDetailPanelProps) {
  const assigneeId = useId();
  const sla = incident === null ? null : slaStatus(incident, now);

  return (
    <SidePanel
      open={incident !== null}
      onClose={onClose}
      closeLabel="el detalle del incidente"
      onPrev={onPrev}
      onNext={onNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
      title={incident?.title ?? ''}
      eyebrow={
        incident !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-text-muted">{incident.id}</span>
            <SeverityBadge severity={incident.severity} />
            <StatusPill status={incident.status} />
          </div>
        )
      }
    >
      {incident !== null && sla !== null && (
        <div className="flex flex-col gap-6">
          <p className="text-sm leading-relaxed text-text-secondary">{incident.description}</p>

          <section
            aria-label="Plazo de resolución"
            className="rounded-card bg-surface-sunken p-3.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-text-primary">
                Plazo de {formatDurationFromHours(sla.targetHours)}
              </p>
              <p className={cn('text-xs font-semibold', SLA_STATE_META[sla.state].textClassName)}>
                {SLA_STATE_META[sla.state].label}
              </p>
            </div>
            <ProgressBar
              value={sla.ratio}
              label="Plazo consumido"
              barClassName={SLA_STATE_META[sla.state].barClassName}
              className="mt-2.5 bg-surface-card"
            />
            <p className="tabular mt-2 text-xs text-text-muted">
              {incident.resolvedAt === null ? 'Abierto hace ' : 'Resuelto en '}
              {formatDurationFromHours(sla.elapsedHours)}
            </p>
          </section>

          <section>
            <SectionTitle>Acciones</SectionTitle>
            {/* Un botón por estado, con el vigente marcado: se ve el recorrido
                entero y se puede saltar a cualquier punto, no sólo al siguiente. */}
            <div role="group" aria-label="Cambiar el estado" className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((option) => {
                const isCurrent = option.value === incident.status;
                return (
                  <Button
                    key={option.value}
                    size="sm"
                    variant={isCurrent ? 'primary' : 'outline'}
                    aria-pressed={isCurrent}
                    onClick={() => onChangeStatus(incident, option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <Avatar name={incident.assignee} size="sm" />
              <div className="min-w-0 flex-1">
                <label htmlFor={assigneeId} className="sr-only">
                  Responsable
                </label>
                <select
                  id={assigneeId}
                  value={incident.assignee}
                  onChange={(event) => onAssign(incident, event.target.value)}
                  className={cn(CONTROL_CLASS, 'h-9')}
                >
                  {TEAM.map((analyst) => (
                    <option key={analyst.name} value={analyst.name}>
                      {analyst.name} · {analyst.role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section>
            <SectionTitle>Datos del incidente</SectionTitle>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailField label="Estado">
                <span className={STATUS_META[incident.status].textClassName}>
                  {STATUS_META[incident.status].label}
                </span>
              </DetailField>

              <DetailField label="Categoría">{CATEGORY_META[incident.category].label}</DetailField>

              <DetailField label="Detectado">
                <time
                  dateTime={incident.detectedAt}
                  title={formatLongDateTime(incident.detectedAt)}
                  className="tabular"
                >
                  {formatMediumDateTime(incident.detectedAt)}
                </time>
              </DetailField>

              {incident.resolvedAt !== null && (
                <DetailField label="Cerrado">
                  <time
                    dateTime={incident.resolvedAt}
                    title={formatLongDateTime(incident.resolvedAt)}
                    className="tabular"
                  >
                    {formatMediumDateTime(incident.resolvedAt)}
                  </time>
                </DetailField>
              )}

              <DetailField label="IP de origen">
                {incident.sourceIp === null ? (
                  <span className="text-text-muted">Sin origen de red</span>
                ) : (
                  <span className="font-mono">{incident.sourceIp}</span>
                )}
              </DetailField>
            </dl>
          </section>

          <section>
            <SectionTitle>Activos afectados ({incident.affectedAssets.length})</SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {incident.affectedAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between gap-3 rounded-control bg-surface-sunken px-3 py-2"
                >
                  <span className="truncate font-mono text-xs text-text-primary">{asset.name}</span>
                  <span className="shrink-0 text-xs text-text-muted">
                    {ASSET_KIND_LABEL[asset.kind]}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle>Bitácora</SectionTitle>
            <IncidentTimeline events={incident.timeline} />
          </section>
        </div>
      )}
    </SidePanel>
  );
}
