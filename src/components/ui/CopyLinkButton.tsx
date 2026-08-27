/**
 * Copia al portapapeles el enlace de la vista actual.
 *
 * Existe para hacer visible algo que si no sería invisible: todo el estado de
 * la vista vive en la URL, pero nadie que abra el tablero por primera vez tiene
 * motivo para mirar la barra de direcciones. Un botón lo convierte en una
 * función que se puede descubrir.
 *
 * La confirmación es el propio botón cambiando de texto e icono durante dos
 * segundos, no un aviso flotante: la respuesta pertenece al sitio donde ocurrió
 * la acción.
 */

import { Check, Link2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from './Button';

/** Cuánto dura la confirmación antes de volver al estado normal. */
const FEEDBACK_MS = 2000;

type CopyState = 'idle' | 'copied' | 'failed';

export function CopyLinkButton() {
  const [state, setState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Si el componente se va mientras el temporizador corre, cancelarlo evita
  // llamar a `setState` sobre algo que ya no está montado.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);

    try {
      // `clipboard` sólo existe en contexto seguro; en http:// sin localhost
      // la propiedad no está y hay que decirlo en lugar de fingir que copió.
      await navigator.clipboard.writeText(window.location.href);
      setState('copied');
    } catch {
      setState('failed');
    }

    timerRef.current = setTimeout(() => {
      setState('idle');
    }, FEEDBACK_MS);
  };

  const label =
    state === 'copied' ? 'Copiado' : state === 'failed' ? 'No se pudo' : 'Copiar enlace';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void handleCopy();
      }}
      title="Copiar el enlace de esta vista, con sus filtros y su orden"
      // El cambio de texto lo anuncia `aria-live`; sin esto, quien no ve el
      // botón no se entera de que la acción funcionó.
      aria-live="polite"
    >
      {state === 'copied' ? (
        <Check aria-hidden="true" className="size-3.5 text-status-resolved" />
      ) : (
        <Link2 aria-hidden="true" className="size-3.5" />
      )}
      {label}
    </Button>
  );
}
