/**
 * Estado del ciclo de vida: punto de color y texto, sin fondo.
 *
 * Deliberadamente más liviano que la severidad. Si ambos fueran píldoras de
 * color competirían por la atención y la fila perdería jerarquía; la severidad
 * es lo que decide a qué se responde primero.
 */

import { cn } from '@/lib/cn';
import { STATUS_META } from '@/lib/catalog';
import type { IncidentStatus } from '@/types';

interface StatusBadgeProps {
  readonly status: IncidentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_META[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-text-secondary">
      <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-pill', meta.dotClassName)} />
      {meta.label}
    </span>
  );
}
