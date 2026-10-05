/**
 * Campana de la barra superior: lo que requiere atención ahora.
 *
 * No es un historial de eventos. Es una lista viva de los casos sin resolver
 * que son críticos o cuyo plazo está vencido o por vencer, que es lo único que
 * justifica un punto rojo. Un contador que también subiera con cada incidente
 * de severidad baja se aprende a ignorar en una tarde.
 *
 * Es un patrón de revelación (`aria-expanded` + `aria-controls`), no un menú:
 * dentro hay enlaces a incidentes, no órdenes.
 */

import { Bell, CircleCheck } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { SEVERITY_META, SLA_STATE_META } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { buildPriorityQueue } from '@/lib/metrics';
import { slaStatus } from '@/lib/sla';
import type { Incident } from '@/types';

/** Cuántos caben sin que el panel necesite scroll en una pantalla corta. */
const MAX_ITEMS = 6;

interface NotificationsMenuProps {
  readonly incidents: readonly Incident[];
  readonly now: number;
  readonly onOpenIncident: (incident: Incident) => void;
  readonly onShowAll: () => void;
}

export function NotificationsMenu({
  incidents,
  now,
  onOpenIncident,
  onShowAll,
}: NotificationsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const urgent = useMemo(() => {
    const needsAttention = incidents.filter((incident) => {
      if (incident.resolvedAt !== null) return false;
      const { state } = slaStatus(incident, now);
      return incident.severity === 'critical' || state === 'breached' || state === 'at-risk';
    });
    return {
      total: needsAttention.length,
      items: buildPriorityQueue(needsAttention, now, MAX_ITEMS),
    };
  }, [incidents, now]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) === false) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="icon"
        aria-label={
          urgent.total === 0
            ? 'Avisos: nada requiere atención'
            : `Avisos: ${urgent.total} ${urgent.total === 1 ? 'caso requiere' : 'casos requieren'} atención`
        }
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((current) => !current)}
        className="relative"
      >
        <Bell aria-hidden="true" className="size-4.5" />
        {urgent.total > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 size-2.5 rounded-pill bg-severity-critical-solid ring-2 ring-surface-card"
          />
        )}
      </Button>

      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-40 mt-2 w-[min(calc(100vw-1.5rem),22rem)] rounded-card bg-surface-overlay p-2 shadow-popover ring-1 ring-border-subtle motion-safe:animate-pop-in"
        >
          <div className="flex items-baseline justify-between gap-3 px-2.5 pt-1.5 pb-2">
            <h2 className="text-sm font-semibold text-text-primary">Requieren atención</h2>
            <p className="tabular text-xs text-text-muted">{urgent.total}</p>
          </div>

          {urgent.items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center">
              <CircleCheck aria-hidden="true" className="size-6 text-status-resolved" />
              <p className="text-sm font-medium text-text-primary">Todo bajo control</p>
              <p className="text-xs text-text-muted">
                No hay críticos abiertos ni plazos por vencer.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {urgent.items.map((incident) => {
                const { state } = slaStatus(incident, now);
                return (
                  <li key={incident.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenIncident(incident);
                      }}
                      className="flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-hover"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-pill',
                          SEVERITY_META[incident.severity].dotClassName,
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">
                          {incident.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-text-muted">
                          <span className="font-mono">{incident.id}</span>
                          {' · '}
                          {SEVERITY_META[incident.severity].label}
                          {' · '}
                          <span className={SLA_STATE_META[state].textClassName}>
                            {SLA_STATE_META[state].label}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-1 border-t border-border-subtle pt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                onShowAll();
              }}
            >
              Ver todos los casos sin resolver
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
