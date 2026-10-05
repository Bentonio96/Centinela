/**
 * Interruptor de dos posiciones.
 *
 * Es un `<button role="switch">` con `aria-checked`, que es como se anuncia
 * "activado / desactivado". La etiqueta visible va fuera, enlazada por
 * `aria-labelledby`, para que el nombre accesible sea exactamente lo que se
 * lee en pantalla.
 */

import { cn } from '@/lib/cn';

interface SwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  /** Id del elemento que nombra el interruptor. */
  readonly labelledBy: string;
  readonly describedBy?: string | undefined;
}

export function Switch({ checked, onChange, labelledBy, describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-200',
        checked ? 'bg-accent' : 'bg-border-strong',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-pill bg-white shadow-card transition-transform duration-200 ease-out-soft',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}
