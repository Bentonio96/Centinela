/**
 * Campo de búsqueda con icono y botón de limpiar.
 *
 * Es `type="search"` para que el teclado móvil y los lectores de pantalla lo
 * traten como tal. El botón nativo de limpiar de WebKit se oculta porque
 * aparece con un estilo ajeno al resto de la interfaz y sin foco visible.
 */

import { Search, X } from 'lucide-react';
import { useId, type RefObject } from 'react';

import { cn } from '@/lib/cn';

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Etiqueta accesible; se muestra sólo para lectores de pantalla. */
  readonly label: string;
  readonly placeholder?: string;
  readonly className?: string;
  /** Permite a quien lo monta enfocarlo, p. ej. desde un atajo de teclado. */
  readonly inputRef?: RefObject<HTMLInputElement | null> | undefined;
  /**
   * Tecla que enfoca el campo, dibujada dentro como pista.
   *
   * Se oculta en pantallas pequeñas: sin teclado físico, anunciar un atajo es
   * ocupar sitio para no decir nada.
   */
  readonly shortcutHint?: string | undefined;
}

export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
  inputRef,
  shortcutHint,
}: SearchInputProps) {
  const inputId = useId();
  const showHint = shortcutHint !== undefined && value.length === 0;

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
      />
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-control border border-border-subtle bg-surface-sunken pr-9 pl-9 text-sm',
          'text-text-primary placeholder:text-text-muted',
          'hover:border-border-strong focus:border-accent focus:outline-none',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {showHint && (
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-text-muted sm:block"
        >
          {shortcutHint}
        </kbd>
      )}

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-control text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
