/**
 * Panel lateral modal.
 *
 * Está construido sobre `<dialog>` nativo en lugar de un `div` con
 * `role="dialog"`. Con `showModal()` el navegador ya entrega, y bien, todo lo
 * que habría que reimplementar a mano: atrapa el foco, cierra con Escape,
 * vuelve el resto de la página inerte para lectores de pantalla y devuelve el
 * foco al elemento que lo abrió. Reescribir eso es la fuente habitual de
 * modales inaccesibles.
 *
 * Lo único que el navegador no hace es bloquear el scroll de fondo, así que eso
 * sí se maneja aquí.
 *
 * Las flechas izquierda y derecha recorren la lista sin cerrar el panel, que es
 * el gesto real de triaje: se revisan diez incidentes seguidos, no uno. Los
 * botones existen además del atajo — un atajo que no está dibujado en ninguna
 * parte no lo descubre nadie.
 */

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';

import { isTypingTarget } from '@/lib/keyboard';
import { Button } from './Button';

interface SidePanelProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  /** Línea superior sobre el título, p. ej. el identificador del incidente. */
  readonly eyebrow?: ReactNode;
  readonly children: ReactNode;
  /** Navegación entre elementos hermanos, si el contexto la permite. */
  readonly onPrev?: (() => void) | undefined;
  readonly onNext?: (() => void) | undefined;
  readonly hasPrev?: boolean | undefined;
  readonly hasNext?: boolean | undefined;
}

export function SidePanel({
  open,
  onClose,
  title,
  eyebrow,
  children,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: SidePanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const canNavigate = onPrev !== undefined && onNext !== undefined;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !canNavigate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Dentro del panel hay campos de texto donde las flechas mueven el cursor.
      if (isTypingTarget(event.target)) return;

      if (event.key === 'ArrowLeft' && hasPrev) {
        event.preventDefault();
        onPrev?.();
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onNext?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, canNavigate, hasPrev, hasNext, onPrev, onNext]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
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
      className="my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-full border-l border-glass bg-surface-overlay/90 p-0 text-text-primary shadow-panel backdrop-blur-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm sm:w-panel motion-safe:animate-panel-in"
    >
      {/* El contenido sólo se monta con el panel abierto: así el detalle no
          queda en el DOM cuando no se está mostrando. */}
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-gutter-sm py-3">
            <div className="min-w-0">
              {eyebrow !== undefined && <div className="mb-1">{eyebrow}</div>}
              <h2 id={titleId} className="text-base leading-snug font-semibold text-text-primary">
                {title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {canNavigate && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onPrev}
                    disabled={!hasPrev}
                    aria-label="Incidente anterior"
                    title="Incidente anterior (flecha izquierda)"
                  >
                    <ChevronLeft aria-hidden="true" className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={onNext}
                    disabled={!hasNext}
                    aria-label="Incidente siguiente"
                    title="Incidente siguiente (flecha derecha)"
                  >
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Button>
                  <span aria-hidden="true" className="mx-1 h-5 w-px bg-border-subtle" />
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={onClose}
                aria-label="Cerrar el detalle del incidente"
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-gutter-sm py-gutter-sm">{children}</div>
        </div>
      )}
    </dialog>
  );
}
