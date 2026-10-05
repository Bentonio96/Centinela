/**
 * Barra superior: la búsqueda global, los avisos, el tema y quién usa la
 * consola.
 *
 * La "búsqueda" es un botón con forma de campo, no un campo. Abre la paleta de
 * comandos, que es donde de verdad se escribe: un `<input>` aquí que al
 * enfocarse abriera otra cosa mentiría sobre lo que es, y dejaría a un lector
 * de pantalla anunciando un cuadro de texto en el que no se puede escribir.
 */

import { Menu as MenuIcon, Moon, Search, Sun } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { Theme } from '@/data/settings';
import { findAnalyst } from '@/data/team';
import { PALETTE_SHORTCUT_LABEL } from '@/lib/keyboard';
import type { Incident } from '@/types';
import { NotificationsMenu } from './NotificationsMenu';

interface TopbarProps {
  readonly theme: Theme;
  readonly onToggleTheme: () => void;
  readonly onOpenPalette: () => void;
  /** Abre la navegación en pantallas donde la barra lateral no cabe. */
  readonly onOpenMenu: () => void;
  readonly onOpenProfile: () => void;
  readonly live: boolean;
  readonly me: string;
  readonly incidents: readonly Incident[];
  readonly now: number;
  readonly onOpenIncident: (incident: Incident) => void;
  readonly onShowUnresolved: () => void;
}

export function Topbar({
  theme,
  onToggleTheme,
  onOpenPalette,
  onOpenMenu,
  onOpenProfile,
  live,
  me,
  incidents,
  now,
  onOpenIncident,
  onShowUnresolved,
}: TopbarProps) {
  const analyst = findAnalyst(me);
  const goingToDark = theme === 'light';
  const ThemeIcon = goingToDark ? Moon : Sun;

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-2 rounded-panel bg-surface-panel px-3">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Abrir la navegación"
      >
        <MenuIcon aria-hidden="true" className="size-5" />
      </Button>

      <button
        type="button"
        onClick={onOpenPalette}
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-pill bg-surface-card px-3.5 text-sm text-text-muted shadow-card transition-colors hover:text-text-secondary sm:max-w-sm dark:ring-1 dark:ring-border-subtle"
      >
        <Search aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
        <span className="truncate">Buscar incidentes, personas y acciones</span>
        <kbd
          aria-hidden="true"
          className="ml-auto hidden shrink-0 rounded-md border border-border-subtle bg-surface-sunken px-1.5 py-0.5 font-sans text-[0.6875rem] leading-none font-semibold text-text-muted sm:block"
        >
          {PALETTE_SHORTCUT_LABEL}
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {live && (
          <p className="mr-1 hidden items-center gap-2 rounded-pill bg-accent-soft py-1.5 pr-3 pl-2.5 text-xs font-semibold text-accent-text sm:flex">
            <span aria-hidden="true" className="relative flex size-2 items-center justify-center">
              <span className="absolute size-2 rounded-pill bg-brand-600 motion-safe:animate-halo" />
              <span className="relative size-2 rounded-pill bg-brand-600" />
            </span>
            En vivo
          </p>
        )}

        <NotificationsMenu
          incidents={incidents}
          now={now}
          onOpenIncident={onOpenIncident}
          onShowAll={onShowUnresolved}
        />

        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          aria-label={goingToDark ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
          title={goingToDark ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'}
        >
          <ThemeIcon aria-hidden="true" className="size-4.5" />
        </Button>

        <button
          type="button"
          onClick={onOpenProfile}
          title="Cambiar con qué analista usas la consola"
          className="ml-1 flex items-center gap-2.5 rounded-pill py-1 pr-1 pl-1 transition-colors hover:bg-surface-hover md:pr-3.5"
        >
          <Avatar name={me} size="md" />
          <span className="hidden min-w-0 text-left md:block">
            <span className="block truncate text-sm leading-tight font-semibold text-text-primary">
              {me}
            </span>
            <span className="block truncate text-xs leading-tight text-text-muted">
              {analyst?.role ?? 'Analista'}
            </span>
          </span>
          <span className="sr-only md:hidden">{me}: abrir ajustes de perfil</span>
        </button>
      </div>
    </header>
  );
}
