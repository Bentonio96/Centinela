/**
 * Diálogo modal centrado.
 *
 * Construido sobre `<dialog>` nativo, igual que el panel lateral: con
 * `showModal()` el navegador atrapa el foco, cierra con Escape, vuelve inerte
 * el resto de la página y devuelve el foco a quien lo abrió. Reescribir eso a
 * mano es la fuente habitual de modales inaccesibles.
 *
 * El contenido sólo se monta con el diálogo abierto. Así un formulario dentro
 * arranca limpio cada vez, sin tener que acordarse de reiniciar su estado.
 */

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Button } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Readonly<Record<ModalSize, string>> = {
  sm: 'w-[min(92vw,26rem)]',
  md: 'w-[min(92vw,34rem)]',
  lg: 'w-[min(94vw,44rem)]',
};

interface ModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string | undefined;
  readonly size?: ModalSize;
  readonly children: ReactNode;
  /** Fila de acciones fija al pie, fuera del área que scrollea. */
  readonly footer?: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // `showModal()` enfoca el primer control, que aquí es el botón de
      // cerrar. Un formulario quiere empezar en su primer campo: lo marca con
      // `data-autofocus`, porque `autoFocus` de React se dispara al montar,
      // cuando el diálogo todavía está cerrado y nada dentro es enfocable.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
      // `close` cubre tanto Escape como el cierre programático, así que el
      // estado de React se mantiene sincronizado por una sola vía.
      onClose={onClose}
      onClick={(event) => {
        // El área del backdrop pertenece al propio `dialog`: si el clic cayó
        // ahí y no en el contenido, es un clic fuera.
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
      className={cn(
        // `m-auto` explícito: el reset de Tailwind anula el margen automático
        // con el que el navegador centra un `dialog`.
        'm-auto max-h-[min(88dvh,46rem)] rounded-panel bg-surface-overlay p-0 text-text-primary shadow-popover',
        'backdrop:bg-brand-950/55 backdrop:backdrop-blur-[3px] dark:ring-1 dark:ring-border-strong',
        'open:flex open:flex-col motion-safe:open:animate-modal-in',
        SIZE_CLASSES[size],
      )}
    >
      {open && (
        <>
          <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-1">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg leading-tight font-semibold">
                {title}
              </h2>
              {description !== undefined && (
                <p id={descriptionId} className="mt-1 text-sm text-text-secondary">
                  {description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="-mt-1 -mr-1.5"
              onClick={onClose}
              aria-label="Cerrar"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </header>

          <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

          {footer !== undefined && (
            <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle px-5 py-3.5">
              {footer}
            </footer>
          )}
        </>
      )}
    </dialog>
  );
}
