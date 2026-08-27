/**
 * Interruptor del flujo en tiempo real.
 *
 * Activo, el botón se enciende: el punto late y un halo lo rodea, para que se
 * note que la pantalla está viva incluso cuando no entra nada. Ese es
 * exactamente su trabajo — distinguir "no ha pasado nada" de "esto se quedó
 * congelado", que sin un latido son idénticos.
 *
 * El movimiento va bajo `motion-safe`: quien pida menos movimiento ve el punto
 * y el halo fijos, que siguen comunicando el estado sin animación.
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
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-control border px-3 text-xs font-medium',
        'transition-[colors,box-shadow,transform] duration-200 active:scale-95',
        running
          ? 'border-status-resolved/60 bg-gradient-to-b from-status-resolved/18 to-status-resolved/5 text-text-primary shadow-[0_0_18px_-6px_var(--status-resolved)]'
          : 'border-border-strong text-text-secondary hover:bg-surface-hover hover:text-text-primary',
      )}
    >
      {running ? (
        <span aria-hidden="true" className="relative flex size-2 shrink-0 items-center justify-center">
          <span className="absolute size-2 rounded-pill bg-status-resolved motion-safe:animate-halo" />
          <span className="relative size-2 rounded-pill bg-status-resolved" />
        </span>
      ) : (
        <Radio aria-hidden="true" className="size-3.5 shrink-0" />
      )}
      <span className="hidden sm:inline">{running ? 'En vivo' : 'Ver en vivo'}</span>
    </button>
  );
}
