/**
 * Interruptor del flujo en tiempo real.
 *
 * Activo, muestra un punto que late para que se note que la pantalla está viva
 * incluso cuando no entra nada. El latido va bajo `motion-safe`: quien pida
 * menos movimiento ve el punto fijo, que sigue comunicando el estado.
 */

import { Radio } from 'lucide-react';

import { cn } from '@/lib/cn';

interface LiveToggleProps {
  readonly running: boolean;
  readonly onToggle: () => void;
}

export function LiveToggle({ running, onToggle }: LiveToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      // `aria-pressed` es lo que anuncia que esto es un interruptor y en qué
      // posición está; el texto de la etiqueta describe la acción.
      aria-pressed={running}
      aria-label={running ? 'Detener el flujo en tiempo real' : 'Activar el flujo en tiempo real'}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-control border px-3 text-xs font-medium transition-colors',
        running
          ? 'border-status-resolved bg-surface-hover text-text-primary'
          : 'border-border-strong text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      )}
    >
      {running ? (
        <span aria-hidden="true" className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full rounded-pill bg-status-resolved opacity-70 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-pill bg-status-resolved" />
        </span>
      ) : (
        <Radio aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      <span className="hidden sm:inline">{running ? 'En vivo' : 'Ver en vivo'}</span>
    </button>
  );
}
