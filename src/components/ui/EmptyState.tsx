/**
 * Estado vacío. Además de decir que no hay nada, ofrece la salida:
 * un callejón sin salida es un error de diseño, no un caso borde.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  /** Acción para recuperarse, típicamente limpiar los filtros. */
  readonly action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-gutter-sm py-12 text-center">
      <Icon aria-hidden="true" className="size-6 text-text-muted" />
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      {action !== undefined && <div className="mt-2">{action}</div>}
    </div>
  );
}
