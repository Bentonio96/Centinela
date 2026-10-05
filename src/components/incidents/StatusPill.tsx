/**
 * Estado del ciclo de vida como píldora teñida.
 *
 * Es la versión con peso del estado, para los sitios donde el estado es el
 * dato principal de la fila —el equipo en turno, el perfil de un analista— y
 * no compite con la severidad. En la tabla, donde sí compite, se usa
 * `StatusBadge`, que es sólo punto y texto.
 *
 * Fondo, borde y texto se derivan del token del estado con `color-mix`, así
 * que no hay tres tokens más por cada uno.
 */

import { STATUS_META } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { cssVars } from '@/lib/cssVars';
import type { IncidentStatus } from '@/types';

interface StatusPillProps {
  readonly status: IncidentStatus;
  readonly className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'tint-chip inline-flex items-center rounded-pill border px-2 py-0.5 text-[0.6875rem] leading-4 font-semibold whitespace-nowrap',
        className,
      )}
      style={cssVars({ '--tint': `var(--status-${status})` })}
    >
      {STATUS_META[status].label}
    </span>
  );
}
