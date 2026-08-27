/**
 * Detalle completo de un incidente, en el panel lateral.
 *
 * El panel se mantiene montado aunque no haya incidente seleccionado: es
 * `SidePanel` quien controla la apertura, y desmontarlo aquí impediría que el
 * navegador ejecute el cierre del `<dialog>` y devuelva el foco a la fila.
 */

import type { ReactNode } from 'react';

import { SidePanel } from '@/components/ui/SidePanel';
import { ASSET_KIND_LABEL, CATEGORY_META, STATUS_META } from '@/lib/catalog';
import {
  formatDurationFromHours,
  formatLongDateTime,
  formatMediumDateTime,
  hoursBetween,
} from '@/lib/format';
import type { Incident } from '@/types';
import { SeverityBadge } from './SeverityBadge';
import { IncidentTimeline } from './IncidentTimeline';

interface DetailFieldProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Par etiqueta/valor. Es `dt`/`dd` real: la relación entre ambos se anuncia sola. */
function DetailField({ label, children }: DetailFieldProps) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-text-primary">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { readonly children: ReactNode }) {
  return (
    <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-text-muted uppercase">
      {children}
    </h3>
  );
}

interface IncidentDetailPanelProps {
  readonly incident: Incident | null;
  readonly onClose: () => void;
  /** Recorrido por la página visible sin cerrar el panel. */
  readonly onPrev: () => void;
  readonly onNext: () => void;
  readonly hasPrev: boolean;
  readonly hasNext: boolean;
}

export function IncidentDetailPanel({
  incident,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: IncidentDetailPanelProps) {
  const elapsedHours =
    incident === null
      ? 0
      : hoursBetween(incident.detectedAt, incident.resolvedAt ?? new Date().toISOString());

  return (
    <SidePanel
      open={incident !== null}
      onClose={onClose}
      onPrev={onPrev}
      onNext={onNext}
      hasPrev={hasPrev}
      hasNext={hasNext}
      title={incident?.title ?? ''}
      eyebrow={
        incident !== null && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-muted">{incident.id}</span>
            <SeverityBadge severity={incident.severity} />
          </div>
        )
      }
    >
      {incident !== null && (
        <div className="flex flex-col gap-6">
          <p className="text-sm leading-relaxed text-text-secondary">{incident.description}</p>

          <section>
            <SectionTitle>Datos del incidente</SectionTitle>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
              <DetailField label="Estado">
                <span className={STATUS_META[incident.status].textClassName}>
                  {STATUS_META[incident.status].label}
                </span>
              </DetailField>

              <DetailField label="Categoría">{CATEGORY_META[incident.category].label}</DetailField>

              <DetailField label="Responsable">{incident.assignee}</DetailField>

              <DetailField label={incident.resolvedAt === null ? 'Abierto hace' : 'Resuelto en'}>
                <span className="tabular">{formatDurationFromHours(elapsedHours)}</span>
              </DetailField>

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
            <SectionTitle>
              Activos afectados ({incident.affectedAssets.length})
            </SectionTitle>
            <ul className="flex flex-col gap-1.5">
              {incident.affectedAssets.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center justify-between gap-3 rounded-control border border-border-subtle bg-surface-sunken px-2.5 py-1.5"
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
