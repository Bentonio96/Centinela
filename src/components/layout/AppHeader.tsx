/**
 * Cabecera de la aplicación: identidad, alcance de lo que se está mirando y
 * el cambio de tema.
 *
 * Declarar la ventana temporal aquí evita repetirla en cada tarjeta y deja
 * claro, de entrada, qué período describen los indicadores.
 */

import { ShieldCheck } from 'lucide-react';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { Theme } from '@/hooks/useTheme';

interface AppHeaderProps {
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
  /** Momento de la última actualización de los datos, ya formateado. */
  readonly updatedAt: string;
}

export function AppHeader({ theme, onToggleTheme, updatedAt }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border-subtle bg-surface-base/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-gutter-sm py-3 lg:px-gutter">
        <div className="flex items-center gap-2.5">
          <ShieldCheck aria-hidden="true" className="size-5 shrink-0 text-accent" />
          <div>
            <h1 className="text-sm leading-tight font-semibold text-text-primary">Centinela</h1>
            <p className="text-xs leading-tight text-text-muted">
              Monitoreo de incidentes · últimos 30 días
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-text-muted sm:block">
            Actualizado <span className="tabular">{updatedAt}</span>
          </p>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
