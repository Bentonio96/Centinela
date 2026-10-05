/**
 * Campo de formulario: etiqueta visible, control y ayuda opcional.
 *
 * La etiqueta es un `<label>` real enlazado por `htmlFor`, no un texto encima
 * del campo: es lo que hace que pulsarla enfoque el control y que un lector de
 * pantalla lo nombre.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface FieldProps {
  readonly label: string;
  /** Id del control que nombra. */
  readonly htmlFor: string;
  readonly hint?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export function Field({ label, htmlFor, hint, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-text-secondary">
        {label}
      </label>
      {children}
      {hint !== undefined && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
