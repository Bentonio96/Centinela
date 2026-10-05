/**
 * Pila de avisos flotantes, abajo y al centro.
 *
 * Se anuncia con `role="status"`, que es cortés: espera a que el lector de
 * pantalla termine la frase en curso. `assertive` interrumpiría a media
 * palabra a alguien que está leyendo una fila, y ningún aviso de aquí es una
 * alarma de evacuación — el incidente ya está en la tabla y en los
 * indicadores; el aviso sólo se adelanta.
 *
 * El contenedor no intercepta el puntero; sólo lo hace cada aviso. Si no, una
 * franja invisible a lo ancho del pie se comería los clics de lo que hubiera
 * debajo.
 */

import { CircleCheck, Siren, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { toasts, type ToastTone } from '@/data/toasts';
import { useToasts } from '@/hooks/useStore';
import { cn } from '@/lib/cn';

const TONE_CLASSES: Readonly<Record<ToastTone, string>> = {
  default: 'bg-brand-950 text-white ring-white/10',
  success: 'bg-brand-950 text-white ring-white/10',
  critical: 'bg-severity-critical-solid text-white ring-white/20',
};

/**
 * Dónde montar los avisos: dentro del diálogo modal abierto, si lo hay.
 *
 * Un `<dialog>` abierto con `showModal()` vive en la capa superior del
 * navegador y vuelve inerte todo lo demás. Un aviso montado en `body` quedaría
 * debajo del telón, atenuado, y su botón "Deshacer" no se podría pulsar —
 * justo cuando se acaba de cambiar un estado desde el panel de detalle. Ningún
 * `z-index` lo arregla; lo único que está por encima de un diálogo modal es su
 * propio contenido.
 */
function useToastHost(): Element {
  const [host, setHost] = useState<Element>(() => document.body);

  useEffect(() => {
    const update = () => {
      const open = document.querySelectorAll('dialog[open]');
      setHost(open[open.length - 1] ?? document.body);
    };

    update();
    // Los diálogos se abren y cierran con el atributo `open`: observar sólo
    // ese atributo basta, y no despierta con ningún otro cambio del DOM.
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => {
      observer.disconnect();
    };
  }, []);

  return host;
}

export function Toaster() {
  const items = useToasts();
  const host = useToastHost();

  return createPortal(
    <div
      role="status"
      aria-label="Avisos"
      className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex flex-col items-center gap-2 sm:bottom-7"
    >
      {items.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex max-w-full items-center gap-2.5 rounded-pill py-2 pr-2 pl-4 text-sm shadow-popover ring-1 motion-safe:animate-toast-in',
            TONE_CLASSES[toast.tone],
          )}
        >
          {toast.tone === 'critical' && <Siren aria-hidden="true" className="size-4 shrink-0" />}
          {toast.tone === 'success' && (
            <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-brand-400" />
          )}

          <p className="min-w-0 truncate">
            <span className="font-semibold">{toast.title}</span>
            {toast.description !== undefined && (
              <span className="text-white/75"> · {toast.description}</span>
            )}
          </p>

          {toast.action !== undefined && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                toasts.dismiss(toast.id);
              }}
              className="shrink-0 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold transition-colors hover:bg-white/25 focus-visible:outline-white"
            >
              {toast.action.label}
            </button>
          )}

          <button
            type="button"
            onClick={() => toasts.dismiss(toast.id)}
            aria-label={`Descartar el aviso: ${toast.title}`}
            className="grid size-7 shrink-0 place-items-center rounded-pill text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      ))}
    </div>,
    host,
  );
}
