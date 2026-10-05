/**
 * Clases compartidas por `input`, `select` y `textarea`.
 *
 * Viven en un módulo sin componentes para que el refresco en caliente de Vite
 * siga funcionando en los archivos que sí los exportan.
 */

import { cn } from '@/lib/cn';

export const CONTROL_CLASS: string = cn(
  'w-full rounded-control border border-border-subtle bg-surface-panel px-3 text-sm text-text-primary',
  'placeholder:text-text-muted transition-colors',
  'hover:border-border-strong focus:border-accent focus:outline-none',
);
