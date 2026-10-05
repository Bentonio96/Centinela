/**
 * Paleta de comandos: una sola caja para ir a una vista, ejecutar una acción,
 * abrir un incidente o ver los casos de un analista.
 *
 * Sigue el patrón de combobox con lista de ARIA. El foco **no sale nunca del
 * campo**: las flechas mueven una opción "activa" que se comunica con
 * `aria-activedescendant`. Mover el foco real a cada opción obligaría a volver
 * al campo para seguir escribiendo, que es justo lo que una paleta evita.
 *
 * Sin texto muestra vistas y acciones; al escribir suma incidentes y personas.
 * La búsqueda ignora acentos y mayúsculas, y exige todos los términos en
 * cualquier orden, igual que la de la tabla.
 */

import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { TEAM } from '@/data/team';
import { CATEGORY_META, SEVERITY_META } from '@/lib/catalog';
import { cn } from '@/lib/cn';
import { createSearchIndex, normalize } from '@/lib/filterIncidents';
import type { Incident } from '@/types';

export interface PaletteCommand {
  readonly id: string;
  readonly group: 'Ir a' | 'Acciones';
  readonly label: string;
  /** Texto a la derecha: el atajo de teclado, si lo tiene. */
  readonly hint?: string | undefined;
  readonly icon: LucideIcon;
  /** Sinónimos por los que también se encuentra. */
  readonly keywords?: string | undefined;
  readonly run: () => void;
}

interface PaletteItem {
  readonly id: string;
  readonly group: string;
  readonly run: () => void;
  readonly render: () => ReactNode;
}

/** Cuántos incidentes se listan: más no caben sin scroll, y hay que afinar. */
const MAX_INCIDENTS = 6;

interface CommandPaletteProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly commands: readonly PaletteCommand[];
  readonly incidents: readonly Incident[];
  readonly onOpenIncident: (incident: Incident) => void;
  readonly onShowAnalyst: (name: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  incidents,
  onOpenIncident,
  onShowAnalyst,
}: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listId = useId();
  const optionId = (index: number) => `${listId}-opcion-${index}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // El índice sólo se construye con la paleta abierta: con ella cerrada no
  // hay motivo para recorrer el dataset en cada llegada del flujo en vivo.
  const searchIndex = useMemo(
    () => (open ? createSearchIndex(incidents) : new Map<string, string>()),
    [open, incidents],
  );

  const items = useMemo<readonly PaletteItem[]>(() => {
    const terms = normalize(query.trim()).split(/\s+/u).filter(Boolean);
    const matches = (text: string) => {
      const haystack = normalize(text);
      return terms.every((term) => haystack.includes(term));
    };

    const result: PaletteItem[] = commands
      .filter((command) => matches(`${command.label} ${command.keywords ?? ''}`))
      .map((command) => {
        const Icon = command.icon;
        return {
          id: command.id,
          group: command.group,
          run: command.run,
          render: () => (
            <>
              <Icon aria-hidden="true" className="size-4 shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate">{command.label}</span>
              {command.hint !== undefined && (
                <kbd className="shrink-0 rounded-md border border-border-subtle bg-surface-sunken px-1.5 py-0.5 font-sans text-[0.6875rem] leading-none font-semibold text-text-muted">
                  {command.hint}
                </kbd>
              )}
            </>
          ),
        };
      });

    if (terms.length === 0) return result;

    const foundIncidents = incidents
      .filter((incident) => {
        const haystack = searchIndex.get(incident.id);
        return haystack !== undefined && terms.every((term) => haystack.includes(term));
      })
      .slice(0, MAX_INCIDENTS);

    for (const incident of foundIncidents) {
      result.push({
        id: `incidente-${incident.id}`,
        group: 'Incidentes',
        run: () => onOpenIncident(incident),
        render: () => (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'size-2 shrink-0 rounded-pill',
                SEVERITY_META[incident.severity].dotClassName,
              )}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{incident.title}</span>
              <span className="block truncate text-xs text-text-muted">
                <span className="font-mono">{incident.id}</span>
                {' · '}
                {SEVERITY_META[incident.severity].label}
                {' · '}
                {CATEGORY_META[incident.category].label}
              </span>
            </span>
          </>
        ),
      });
    }

    for (const analyst of TEAM.filter((member) => matches(`${member.name} ${member.role}`))) {
      result.push({
        id: `analista-${analyst.name}`,
        group: 'Equipo',
        run: () => onShowAnalyst(analyst.name),
        render: () => (
          <>
            <Avatar name={analyst.name} size="xs" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">Casos de {analyst.name}</span>
              <span className="block truncate text-xs text-text-muted">{analyst.role}</span>
            </span>
          </>
        ),
      });
    }

    return result;
  }, [commands, incidents, onOpenIncident, onShowAnalyst, query, searchIndex]);

  // Si la lista se acortó, la opción activa puede haber quedado fuera. Se
  // acota al renderizar en vez de con un efecto, para no pintar un fotograma
  // sin ninguna opción marcada.
  const active = Math.min(activeIndex, Math.max(0, items.length - 1));

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const close = () => {
    setQuery('');
    setActiveIndex(0);
    onClose();
  };

  const runItem = (item: PaletteItem | undefined) => {
    if (item === undefined) return;
    close();
    // En el siguiente ciclo: la paleta termina de cerrarse —y de devolver el
    // foco— antes de que la acción abra otro diálogo encima.
    setTimeout(item.run, 0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex(items.length === 0 ? 0 : (active + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(items.length === 0 ? 0 : (active - 1 + items.length) % items.length);
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(Math.max(0, items.length - 1));
        break;
      case 'Enter':
        event.preventDefault();
        runItem(items[active]);
        break;
      default:
        break;
    }
  };

  // Agrupar conservando el orden y el índice global de cada opción, que es el
  // que usan las flechas.
  const groups: { name: string; entries: { item: PaletteItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.name === item.group) {
      last.entries.push({ item, index });
    } else {
      groups.push({ name: item.group, entries: [{ item, index }] });
    }
  });

  return (
    <dialog
      ref={dialogRef}
      aria-label="Paleta de comandos"
      onClose={close}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className="mx-auto mt-[10dvh] mb-auto max-h-[min(76dvh,34rem)] w-[min(94vw,38rem)] rounded-panel bg-surface-overlay p-0 text-text-primary shadow-popover backdrop:bg-brand-950/55 backdrop:backdrop-blur-[3px] open:flex open:flex-col motion-safe:open:animate-modal-in dark:ring-1 dark:ring-border-strong"
    >
      {open && (
        <>
          <div className="flex items-center gap-3 border-b border-border-subtle px-4.5">
            <Search aria-hidden="true" className="size-4.5 shrink-0 text-text-muted" />
            <input
              type="text"
              role="combobox"
              aria-label="Buscar vistas, acciones, incidentes y personas"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={items.length > 0 ? optionId(active) : undefined}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="¿A dónde vamos?"
              className="h-14 min-w-0 flex-1 bg-transparent text-base text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            <kbd className="shrink-0 rounded-md border border-border-subtle bg-surface-sunken px-1.5 py-0.5 font-sans text-[0.6875rem] leading-none font-semibold text-text-muted">
              Esc
            </kbd>
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Resultados"
            className="scroll-area min-h-0 flex-1 overflow-y-auto p-2"
          >
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-text-muted">
                Nada coincide con «{query}».
              </p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.name}
                  role="group"
                  aria-label={group.name}
                  className="mb-1 last:mb-0"
                >
                  <p
                    aria-hidden="true"
                    className="px-2.5 pt-2 pb-1 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase"
                  >
                    {group.name}
                  </p>
                  {group.entries.map(({ item, index }) => (
                    <div
                      key={item.id}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active}
                      // `mousemove` y no `mouseenter`: al scrollear con el
                      // teclado la lista pasa bajo un cursor quieto, y eso no
                      // debe robarle la selección a las flechas.
                      onMouseMove={() => {
                        if (index !== active) setActiveIndex(index);
                      }}
                      onClick={() => runItem(item)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm',
                        index === active
                          ? 'bg-accent-soft text-text-primary'
                          : 'text-text-secondary',
                      )}
                    >
                      {item.render()}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <p
            aria-hidden="true"
            className="flex items-center gap-4 border-t border-border-subtle px-4.5 py-2.5 text-[0.6875rem] text-text-muted"
          >
            <span>↑ ↓ para moverse</span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="size-3" /> para elegir
            </span>
          </p>
        </>
      )}
    </dialog>
  );
}
