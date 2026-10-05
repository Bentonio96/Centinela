/**
 * Barra lateral: identidad, navegación entre vistas y el enlace al código.
 *
 * Cada entrada es un `<a href>` real y no un botón. Con eso el clic central y
 * "abrir en pestaña nueva" funcionan, la URL se ve al pasar el cursor y los
 * lectores de pantalla la anuncian como enlace, que es lo que es. El clic
 * normal se intercepta para navegar sin recargar.
 *
 * La vista activa se marca con `aria-current="page"`, y visualmente con una
 * barra en el borde y peso de fuente — no sólo con color.
 */

import { ArrowUpRight, Keyboard, ShieldCheck } from 'lucide-react';
import type { MouseEvent } from 'react';

import { cn } from '@/lib/cn';
import { VIEW_PATH, type View } from '@/lib/router';
import { GENERAL_NAV, MAIN_NAV, REPOSITORY_URL, type NavEntry } from './navigation';

interface SidebarProps {
  readonly route: View;
  readonly onNavigate: (view: View) => void;
  /** Casos sin resolver, para el contador junto a "Incidentes". */
  readonly unresolvedCount: number;
  readonly onOpenShortcuts: () => void;
  readonly className?: string;
}

const LINK_CLASS =
  'group relative flex h-9.5 items-center gap-2.5 rounded-control px-3 text-sm transition-colors duration-150';
const IDLE_CLASS = 'text-text-secondary hover:bg-surface-hover hover:text-text-primary';

function SectionLabel({ children }: { readonly children: string }) {
  return (
    <p className="mb-1.5 px-3 text-[0.6875rem] font-semibold tracking-[0.08em] text-text-muted uppercase">
      {children}
    </p>
  );
}

interface NavLinkProps {
  readonly entry: NavEntry;
  readonly active: boolean;
  readonly onNavigate: (view: View) => void;
  readonly badge?: number | undefined;
}

function NavLink({ entry, active, onNavigate, badge }: NavLinkProps) {
  const Icon = entry.icon;

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Con un modificador el usuario pidió otra pestaña o ventana: se respeta.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onNavigate(entry.view);
  };

  return (
    <li>
      <a
        href={VIEW_PATH[entry.view]}
        onClick={handleClick}
        aria-current={active ? 'page' : undefined}
        className={cn(LINK_CLASS, active ? 'font-semibold text-text-primary' : IDLE_CLASS)}
      >
        {active && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 bottom-1.5 -left-3 w-1 rounded-r-pill bg-accent"
          />
        )}
        <Icon
          aria-hidden="true"
          className={cn('size-4.5 shrink-0', active ? 'text-accent-text' : 'text-text-muted')}
        />
        <span className="truncate">{entry.label}</span>

        {badge !== undefined && badge > 0 && (
          <span className="tabular ml-auto rounded-md bg-accent px-1.5 py-0.5 text-[0.625rem] leading-none font-bold text-accent-contrast">
            {badge}
            <span className="sr-only"> sin resolver</span>
          </span>
        )}
      </a>
    </li>
  );
}

export function Sidebar({
  route,
  onNavigate,
  unresolvedCount,
  onOpenShortcuts,
  className,
}: SidebarProps) {
  return (
    <div className={cn('flex h-full flex-col rounded-panel bg-surface-panel p-3', className)}>
      <a
        href={VIEW_PATH.panel}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          event.preventDefault();
          onNavigate('panel');
        }}
        className="flex items-center gap-2.5 rounded-control px-2 py-2"
      >
        <span
          aria-hidden="true"
          className="surface-hero grid size-8 shrink-0 place-items-center rounded-[0.625rem]"
        >
          <ShieldCheck className="size-4.5" />
        </span>
        <span className="text-[1.0625rem] font-semibold tracking-tight text-text-primary">
          Centinela
        </span>
      </a>

      <nav aria-label="Principal" className="scroll-area mt-5 min-h-0 flex-1 overflow-y-auto">
        <SectionLabel>Menú</SectionLabel>
        <ul className="flex flex-col gap-0.5">
          {MAIN_NAV.map((entry) => (
            <NavLink
              key={entry.view}
              entry={entry}
              active={route === entry.view}
              onNavigate={onNavigate}
              badge={entry.view === 'incidentes' ? unresolvedCount : undefined}
            />
          ))}
        </ul>

        <div className="mt-6">
          <SectionLabel>General</SectionLabel>
          <ul className="flex flex-col gap-0.5">
            {GENERAL_NAV.map((entry) => (
              <NavLink
                key={entry.view}
                entry={entry}
                active={route === entry.view}
                onNavigate={onNavigate}
              />
            ))}
            <li>
              <button
                type="button"
                onClick={onOpenShortcuts}
                className={cn(LINK_CLASS, IDLE_CLASS, 'w-full')}
              >
                <Keyboard aria-hidden="true" className="size-4.5 shrink-0 text-text-muted" />
                Atajos de teclado
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="surface-rings mt-3 rounded-card p-3.5">
        <p className="text-[0.9375rem] leading-snug font-semibold">Centinela es código abierto</p>
        <p className="mt-1 text-xs leading-relaxed text-white/70">
          React 19, TypeScript estricto y gráficos hechos a mano. Sin backend.
        </p>
        <a
          href={REPOSITORY_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-pill bg-brand-800 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] transition-colors hover:bg-brand-700 focus-visible:outline-white"
        >
          Ver en GitHub
          <ArrowUpRight aria-hidden="true" className="size-3.5" />
          <span className="sr-only">(se abre en una pestaña nueva)</span>
        </a>
      </div>
    </div>
  );
}
