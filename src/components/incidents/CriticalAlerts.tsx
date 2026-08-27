/**
 * Pila de avisos de incidentes críticos recién llegados.
 *
 * Se anuncia con `role="status"`, que es cortés: espera a que el lector de
 * pantalla termine la frase en curso. `assertive` interrumpiría a media
 * palabra a alguien que está leyendo una fila, y el aviso no es una alarma de
 * evacuación — el incidente ya está en la tabla y en los indicadores. Aquí sólo
 * se adelanta.
 *
 * El contenedor no intercepta el puntero; sólo lo hace cada aviso. Si no, una
 * franja invisible a lo alto de la esquina se comería los clics de lo que
 * hubiera debajo.
 */

import { AlertTriangle, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cssVars } from '@/lib/cssVars';
import { formatRelativeTime } from '@/lib/format';
import type { CriticalAlert } from '@/hooks/useCriticalAlerts';
import type { Incident } from '@/types';

interface CriticalAlertsProps {
  readonly alerts: readonly CriticalAlert[];
  readonly onDismiss: (id: string) => void;
  readonly onOpen: (incident: Incident) => void;
}

export function CriticalAlerts({ alerts, onDismiss, onOpen }: CriticalAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div
      role="status"
      aria-label="Incidentes críticos recientes"
      className="pointer-events-none fixed inset-x-gutter-sm bottom-gutter-sm z-30 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-gutter sm:bottom-gutter sm:w-80"
    >
      {alerts.map((alert, index) => (
        <div
          key={alert.incident.id}
          style={cssVars({ '--rise-delay': `${index * 60}ms` })}
          className="surface-glass pointer-events-auto w-full rounded-card p-3 shadow-lift motion-safe:animate-toast-in"
        >
          <div className="flex items-start gap-2.5">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-control bg-gradient-to-br from-severity-critical/30 to-severity-critical/5 ring-1 ring-severity-critical/25"
            >
              <AlertTriangle className="size-4 text-severity-critical" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-severity-critical uppercase">
                Incidente crítico
              </p>
              <button
                type="button"
                onClick={() => {
                  onOpen(alert.incident);
                  onDismiss(alert.incident.id);
                }}
                className="mt-0.5 block w-full text-left text-sm leading-snug font-medium text-text-primary hover:underline"
              >
                {alert.incident.title}
              </button>
              <p className="mt-1 font-mono text-xs text-text-muted">
                {alert.incident.id} · {formatRelativeTime(alert.incident.detectedAt)}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => onDismiss(alert.incident.id)}
              aria-label={`Descartar el aviso de ${alert.incident.id}`}
            >
              <X aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
