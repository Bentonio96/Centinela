/**
 * Menú desplegable de acciones.
 *
 * Sigue el patrón de botón de menú de ARIA: el disparador declara
 * `aria-haspopup` y `aria-expanded`, la lista es un `menu` y cada opción un
 * `menuitem`. Las flechas recorren las opciones, Escape cierra y devuelve el
 * foco al disparador, y un clic fuera también cierra.
 *
 * Existe sobre todo por el tablero: arrastrar una tarjeta es cómodo con ratón
 * e imposible con teclado o en una pantalla táctil. El menú es la vía que
 * funciona siempre; el arrastre es el atajo.
 */

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly onSelect: () => void;
}

interface MenuProps {
  /** Nombre accesible del disparador: "Acciones de INC-2026-0231". */
  readonly label: string;
  readonly trigger: ReactNode;
  readonly items: readonly MenuItem[];
  /** Encabezado opcional sobre las opciones: "Mover a". */
  readonly heading?: string;
  readonly triggerClassName?: string;
  readonly align?: 'left' | 'right';
}

export function Menu({
  label,
  trigger,
  items,
  heading,
  triggerClassName,
  align = 'right',
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    // Al abrir, el foco va a la primera opción: es lo que hace usable el menú
    // con sólo Enter y flechas.
    listRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) === false) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ];
    const index = options.findIndex((option) => option === document.activeElement);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        // Sin esto, el Escape cerraría también el diálogo que contenga el menú.
        event.stopPropagation();
        close(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        options[(index + 1) % options.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        options[(index - 1 + options.length) % options.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        options[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        options[options.length - 1]?.focus();
        break;
      case 'Tab':
        // Tabular fuera del menú lo cierra, sin secuestrar el foco.
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((current) => !current)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={handleKeyDown}
          className={cn(
            'absolute top-full z-30 mt-1.5 min-w-48 rounded-[0.875rem] bg-surface-overlay p-1.5 shadow-popover ring-1 ring-border-subtle motion-safe:animate-pop-in',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {heading !== undefined && (
            <p className="px-2.5 pt-1 pb-1.5 text-[0.6875rem] font-semibold tracking-wider text-text-muted uppercase">
              {heading}
            </p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
