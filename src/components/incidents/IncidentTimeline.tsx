/**
 * Bitácora del incidente, en orden cronológico.
 *
 * Es una lista ordenada (`ol`) porque el orden *es* la información: leer los
 * pasos desordenados cambiaría lo que ocurrió.
 */

import { cn } from '@/lib/cn';
import { formatDateTime, formatLongDateTime } from '@/lib/format';
import type { IncidentEvent } from '@/types';

interface IncidentTimelineProps {
  readonly events: readonly IncidentEvent[];
}

export function IncidentTimeline({ events }: IncidentTimelineProps) {
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;

        return (
          <li key={`${event.at}-${index}`} className="relative pb-4 pl-6 last:pb-0">
            {/* Hilo que conecta los pasos; se corta en el último. */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute top-3 bottom-0 left-[4px] w-px bg-border-strong"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1.5 left-0 size-[9px] rounded-pill border-2',
                // El último paso es el estado vigente: va lleno.
                isLast
                  ? 'border-brand-600 bg-brand-600'
                  : 'border-border-strong bg-surface-overlay',
              )}
            />

            <p className="text-sm leading-snug text-text-primary">{event.summary}</p>
            <p className="mt-0.5 text-xs text-text-muted">
              <time dateTime={event.at} title={formatLongDateTime(event.at)}>
                {formatDateTime(event.at)}
              </time>
              {' · '}
              {event.actor}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
