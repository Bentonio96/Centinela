/**
 * Cabecera de cada vista: título, una línea que dice para qué sirve y las
 * acciones propias de esa pantalla.
 *
 * El título es el único `h1` de la página. Cambia con la vista, así que
 * recibe el foco al navegar: es lo que anuncia a un lector de pantalla que la
 * pantalla cambió, ya que no hay recarga que lo haga.
 */

import type { ReactNode, RefObject } from 'react';

interface PageHeaderProps {
  readonly title: string;
  readonly description: string;
  readonly actions?: ReactNode;
  readonly headingRef?: RefObject<HTMLHeadingElement | null> | undefined;
}

export function PageHeader({ title, description, actions, headingRef }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-[1.75rem] leading-tight font-semibold tracking-tight text-text-primary focus:outline-none"
        >
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">{description}</p>
      </div>

      {actions !== undefined && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
