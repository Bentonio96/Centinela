/**
 * Los mismos incidentes, como tarjetas apiladas, bajo 768px.
 *
 * No es la tabla con CSS encima: es una lista (`ul`/`li`) donde cada elemento
 * es un botón. Una `<table>` estrechada a 375px obliga a desplazar de lado o
 * deja celdas de dos caracteres, y sus encabezados dejan de tener sentido al
 * apilarse. Aquí el dato lleva su etiqueta al lado.
 */

import { ChevronRight } from 'lucide-react';

import { CATEGORY_META } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { formatLongDateTime, formatRelativeTime } from '@/lib/format';
import type { Incident } from '@/types';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

interface IncidentCardListProps {
  readonly incidents: readonly Incident[];
  readonly selectedId: string | null;
  readonly onSelect: (incident: Incident) => void;
}

export function IncidentCardList({ incidents, selectedId, onSelect }: IncidentCardListProps) {
  return (
    <ul className="divide-y divide-border-subtle">
      {incidents.map((incident) => {
        const isSelected = incident.id === selectedId;
        const primaryAsset = incident.affectedAssets[0];

        return (
          <li key={incident.id}>
            <button
              type="button"
              onClick={() => onSelect(incident)}
              aria-current={isSelected ? 'true' : undefined}
              aria-label={`Ver detalle de ${incident.id}: ${incident.title}`}
              className={cn(
                'flex w-full items-start gap-3 px-gutter-sm py-3 text-left transition-colors',
                'hover:bg-surface-hover',
                isSelected && 'bg-accent-soft/40 shadow-[inset_2px_0_0_0_var(--accent)]',
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={incident.severity} />
                  <span className="font-mono text-xs text-text-muted">{incident.id}</span>
                </div>

                <p className="mt-1.5 text-sm leading-snug font-medium text-text-primary">
                  {incident.title}
                </p>

                <p className="mt-1 truncate text-xs text-text-muted">
                  {CATEGORY_META[incident.category].label}
                  {primaryAsset !== undefined && (
                    <>
                      {' · '}
                      <span className="font-mono">{primaryAsset.name}</span>
                    </>
                  )}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StatusBadge status={incident.status} />
                  <time
                    dateTime={incident.detectedAt}
                    title={formatLongDateTime(incident.detectedAt)}
                    className="text-xs text-text-muted"
                  >
                    {formatRelativeTime(incident.detectedAt)}
                  </time>
                </div>
              </div>

              <ChevronRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-text-muted" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
