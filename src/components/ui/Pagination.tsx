/**
 * Paginación mínima: anterior, siguiente y la posición actual.
 *
 * Va dentro de un `<nav>` con nombre porque es un mecanismo de navegación, y
 * la posición se anuncia con `role="status"` para que el salto de página se
 * comunique sin tener que rastrear la tabla.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from './Button';

interface PaginationProps {
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Paginación de incidentes"
      className="flex items-center justify-between gap-3 border-t border-border-subtle px-gutter-sm py-2.5"
    >
      <Button
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        <ChevronLeft aria-hidden="true" className="size-3.5" />
        Anterior
      </Button>

      <p role="status" className="tabular text-xs text-text-muted">
        Página {page} de {pageCount}
      </p>

      <Button
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Página siguiente"
      >
        Siguiente
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </Button>
    </nav>
  );
}
