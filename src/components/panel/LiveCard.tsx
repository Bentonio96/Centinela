/**
 * Control del flujo en tiempo real, con forma de cronómetro.
 *
 * Reproducir hace entrar incidentes cada pocos segundos; pausar los detiene y
 * conserva el tiempo; detener además pone el reloj a cero. Los incidentes ya
 * recibidos se quedan: son datos, no parte de la reproducción.
 *
 * El reloj sólo despierta a React mientras corre. En pausa `useNow` no monta
 * temporizador, porque repintar el mismo `00:03:12` una vez por segundo es
 * trabajo que no cambia nada en pantalla.
 *
 * El contador de recibidos va en una región `aria-live` cortés: quien no ve la
 * pantalla se entera de que entró un caso sin que se le interrumpa la lectura.
 */

import { Pause, Play, Square } from 'lucide-react';

import { liveElapsedMs, type LiveSession } from '@/data/store';
import { useNow } from '@/hooks/useNow';
import { cn } from '@/lib/cn';
import { formatClock } from '@/lib/format';

interface LiveCardProps {
  readonly running: boolean;
  readonly live: LiveSession;
  readonly onToggle: () => void;
  readonly onReset: () => void;
  readonly className?: string;
}

export function LiveCard({ running, live, onToggle, onReset, className }: LiveCardProps) {
  const now = useNow(running ? 1000 : null);
  const elapsed = liveElapsedMs(live, now);
  const untouched = !running && elapsed === 0 && live.received === 0;

  return (
    <section
      aria-labelledby="flujo-en-vivo"
      className={cn('surface-rings flex flex-col rounded-card p-4', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="flujo-en-vivo" className="text-[0.9375rem] font-semibold">
          Flujo en vivo
        </h2>
        {running && (
          <span aria-hidden="true" className="relative flex size-2.5 items-center justify-center">
            <span className="absolute size-2.5 rounded-pill bg-brand-400 motion-safe:animate-halo" />
            <span className="relative size-2.5 rounded-pill bg-brand-400" />
          </span>
        )}
      </div>

      <p
        // `timer` anuncia el valor sólo cuando se le pregunta, no cada segundo.
        role="timer"
        aria-label="Tiempo con el flujo activo"
        className="tabular mt-3 text-center text-[2.5rem] leading-none font-medium tracking-tight"
      >
        {formatClock(elapsed)}
      </p>

      <p aria-live="polite" className="mt-2 text-center text-xs text-white/70">
        {untouched
          ? 'Simula la llegada de incidentes'
          : `${live.received} ${live.received === 1 ? 'incidente recibido' : 'incidentes recibidos'}`}
      </p>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          // `aria-pressed` anuncia que es un interruptor y en qué posición
          // está; la etiqueta describe la acción que ocurrirá.
          aria-pressed={running}
          aria-label={running ? 'Pausar el flujo en vivo' : 'Iniciar el flujo en vivo'}
          className="grid size-11 place-items-center rounded-pill bg-white text-brand-900 shadow-lift transition-transform duration-150 hover:scale-105 focus-visible:outline-white active:scale-95"
        >
          {running ? (
            <Pause aria-hidden="true" className="size-4.5 fill-current" />
          ) : (
            <Play aria-hidden="true" className="size-4.5 translate-x-px fill-current" />
          )}
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={untouched}
          aria-label="Detener el flujo y reiniciar el cronómetro"
          className="grid size-11 place-items-center rounded-pill bg-severity-critical-solid text-white shadow-lift transition-transform duration-150 hover:scale-105 focus-visible:outline-white active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          <Square aria-hidden="true" className="size-3.5 fill-current" />
        </button>
      </div>
    </section>
  );
}
