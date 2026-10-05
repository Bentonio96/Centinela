/**
 * La navegación en pantallas donde la barra lateral no cabe.
 *
 * Es la misma `Sidebar`, dentro de un `<dialog>` modal anclado a la izquierda.
 * No hay una segunda lista de enlaces que mantener a la par: lo que cambia
 * entre escritorio y móvil es el contenedor, no el contenido.
 */

import { useEffect, useRef } from 'react';

import type { View } from '@/lib/router';
import { Sidebar } from './Sidebar';

interface MobileNavProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly route: View;
  readonly onNavigate: (view: View) => void;
  readonly unresolvedCount: number;
  readonly onOpenShortcuts: () => void;
}

export function MobileNav({
  open,
  onClose,
  route,
  onNavigate,
  unresolvedCount,
  onOpenShortcuts,
}: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Navegación"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-0 h-dvh max-h-none w-[min(86vw,17.5rem)] max-w-none bg-transparent p-2 backdrop:bg-brand-950/55 backdrop:backdrop-blur-[3px] motion-safe:open:animate-pop-in"
    >
      {open && (
        <Sidebar
          route={route}
          onNavigate={(view) => {
            onClose();
            onNavigate(view);
          }}
          unresolvedCount={unresolvedCount}
          onOpenShortcuts={() => {
            onClose();
            // Tras el cierre: un diálogo no se abre encima de otro que todavía
            // está devolviendo el foco.
            setTimeout(onOpenShortcuts, 0);
          }}
          className="shadow-popover"
        />
      )}
    </dialog>
  );
}
