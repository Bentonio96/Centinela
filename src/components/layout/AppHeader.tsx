/**
 * Cabecera de la aplicación: identidad, alcance de lo que se está mirando y
 * los controles globales.
 *
 * Declarar la ventana temporal aquí evita repetirla en cada tarjeta y deja
 * claro, de entrada, qué período describen los indicadores.
 *
 * Es vidrio, como las tarjetas, pero con más desenfoque: el contenido pasa por
 * debajo al scrollear y una translucidez ligera lo dejaría legible a través de
 * la barra. El filo inferior es un degradado que se apaga hacia los bordes, en
 * lugar de una línea recta de lado a lado — es lo mismo que hace la luz sobre
 * un canto real.
 */

import { ShieldCheck } from 'lucide-react';

import { LiveToggle } from '@/components/layout/LiveToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { Theme } from '@/hooks/useTheme';

interface AppHeaderProps {
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
  /** Momento de la última actualización de los datos, ya formateado. */
  readonly updatedAt: string;
  readonly live: boolean;
  readonly onToggleLive: () => void;
}

export function AppHeader({ theme, onToggleTheme, updatedAt, live, onToggleLive }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-transparent bg-surface-base/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-gutter-sm py-3 lg:px-gutter">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-control bg-gradient-to-br from-accent/30 to-accent/5 ring-1 ring-accent/25"
          >
            <ShieldCheck className="size-4.5 text-accent" />
          </span>
          <div className="min-w-0">
            <h1 className="text-sm leading-tight font-semibold text-text-primary">Centinela</h1>
            {/* `truncate` en vez de dejar que envuelva: la cabecera es sticky y
                una segunda línea le roba alto a toda la sesión, no sólo al
                primer pantallazo. */}
            <p className="truncate text-xs leading-tight text-text-muted">
              Monitoreo de incidentes · últimos 30 días
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* La hora de actualización sobrevive en móvil: con el flujo activo es
              justamente el dato que más cambia, y esconderlo dejaba la pantalla
              pequeña sin ninguna señal de frescura. En móvil sólo la hora. */}
          <p className="text-xs whitespace-nowrap text-text-muted">
            <span className="hidden md:inline">Actualizado </span>
            <span className="tabular">{updatedAt}</span>
          </p>
          <LiveToggle running={live} onToggle={onToggleLive} />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      {/* El filo inferior. Va como nodo propio porque un `border-bottom` no
          puede llevar degradado. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent"
      />
    </header>
  );
}
